/**
 * Xero Contacts Cache with Pagination
 *
 * This module fetches ALL contacts from Xero using pagination,
 * then caches them in memory for 10 minutes to avoid repeated API calls.
 *
 * This enables fast local fuzzy searching without hitting Xero API limits.
 */

import { getValidTokens } from "./xero-auth";
import { ExtendedContact, ContactPerson } from "./search";
import * as logger from "./logger";

interface XeroContactPerson {
  FirstName?: string;
  LastName?: string;
  EmailAddress?: string;
}

interface XeroContactFromAPI {
  ContactID: string;
  Name: string;
  EmailAddress?: string;
  AccountNumber?: string;
  ContactNumber?: string;
  IsCustomer: boolean;
  IsSupplier: boolean;
  Purchases?: {
    DefaultAccountCode?: string;
  };
  Sales?: {
    DefaultAccountCode?: string;
  };
  ContactPersons?: XeroContactPerson[];
}

interface XeroContactsResponse {
  Contacts: XeroContactFromAPI[];
}

interface CacheEntry {
  contacts: ExtendedContact[];
  fetchedAt: number;
  userId: string;
}

// In-memory cache: userId -> CacheEntry
const contactsCache = new Map<string, CacheEntry>();
const supplierCache = new Map<string, CacheEntry>(); // Supplier-only cache
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Periodic cache cleanup to prevent memory leaks
// Runs every 10 minutes to remove expired entries
setInterval(() => {
  const now = Date.now();
  let removedCount = 0;

  // Clean up all contacts cache
  for (const [userId, entry] of contactsCache.entries()) {
    if (now - entry.fetchedAt > CACHE_TTL_MS) {
      contactsCache.delete(userId);
      removedCount++;
      logger.info("XERO_CACHE", "Removed expired contacts cache for user", { userId });
    }
  }

  // Clean up supplier-only cache
  for (const [userId, entry] of supplierCache.entries()) {
    if (now - entry.fetchedAt > CACHE_TTL_MS) {
      supplierCache.delete(userId);
      removedCount++;
      logger.info("XERO_CACHE", "Removed expired supplier cache for user", { userId });
    }
  }

  if (removedCount > 0) {
    logger.info("XERO_CACHE", "Cleaned up expired cache entries", { count: removedCount });
  }
}, CACHE_TTL_MS);

/**
 * Normalize Xero API contact to ExtendedContact format
 *
 * PERFORMANCE OPTIMIZATION: Pre-classifies contacts as buyer/supplier at cache warm time
 * This ensures classification is computed once, not on every search.
 */
function normalizeContact(xeroContact: XeroContactFromAPI): ExtendedContact {
  const contactPersons: ContactPerson[] =
    xeroContact.ContactPersons?.map((person) => ({
      firstName: person.FirstName,
      lastName: person.LastName,
      email: person.EmailAddress,
    })) || [];

  // Pre-compute buyer classification
  const isBuyer = xeroContact.IsCustomer ||
                  (xeroContact.Sales?.DefaultAccountCode != null && xeroContact.Sales?.DefaultAccountCode !== "");

  // Pre-compute supplier classification
  const isSupplier = xeroContact.IsSupplier ||
                     (xeroContact.Purchases?.DefaultAccountCode != null && xeroContact.Purchases?.DefaultAccountCode !== "");

  return {
    contactId: xeroContact.ContactID,
    name: xeroContact.Name,
    email: xeroContact.EmailAddress,
    accountNumber: xeroContact.AccountNumber,
    reference: xeroContact.ContactNumber,
    isCustomer: isBuyer,  // Pre-classified
    isSupplier: isSupplier,  // Pre-classified
    defaultPurchaseCode: xeroContact.Purchases?.DefaultAccountCode,
    defaultSalesCode: xeroContact.Sales?.DefaultAccountCode,
    contactPersons: contactPersons.length > 0 ? contactPersons : undefined,
  };
}

/**
 * Fetch contacts from Xero with pagination and optional server-side filtering
 *
 * When searchTerm is provided, uses Xero's where clause for server-side filtering.
 * Otherwise, fetches all contacts for caching purposes.
 *
 * NOTE: Uses shared Xero connection via getValidTokens() fallback.
 * This allows all authenticated users to access Xero contacts.
 *
 * @param userId - Clerk user ID for authentication
 * @param searchTerm - Optional search term for server-side filtering
 * @returns Array of contacts matching search criteria (or all if no search term)
 */
async function fetchAllContactsFromXero(userId: string, searchTerm?: string): Promise<ExtendedContact[]> {
  const startTime = Date.now();
  logger.info("XERO_CACHE", searchTerm ? "Fetching contacts with server-side search" : "Fetching ALL contacts from Xero", { searchTerm });
  logger.info("XERO_CACHE", "Requesting user", { userId });

  // Get valid OAuth tokens using shared connection fallback
  // getValidTokens will try the current user first, then fall back to any team member
  let accessToken: string;
  let tenantId: string;

  try {
    const tokens = await getValidTokens(userId);
    accessToken = tokens.accessToken;
    tenantId = tokens.tenantId;
    logger.info("XERO_CACHE", "Valid tokens obtained for tenant", { tenantId });
  } catch (error: any) {
    logger.error("XERO_CACHE", "Failed to get tokens", { error: error.message });
    throw error;
  }

  const allContacts: ExtendedContact[] = [];
  let page = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    // Build URL with optional where clause for server-side filtering
    let xeroUrl = `https://api.xero.com/api.xro/2.0/Contacts?page=${page}`;

    if (searchTerm && searchTerm.trim().length > 0) {
      // Use Xero's where clause for server-side search
      // Search in Name field using Contains operator
      const whereClause = `Name.Contains("${searchTerm.trim()}")`;
      xeroUrl += `&where=${encodeURIComponent(whereClause)}`;
      logger.info("XERO_CACHE", "Applying server-side filter", { whereClause, page });
    }

    logger.info("XERO_CACHE", "Fetching page", { page });

    const response = await fetch(xeroUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Xero-tenant-id": tenantId,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("XERO_CACHE", "Xero API error on page", {
        page,
        status: response.status,
        error: errorText,
      });
      throw new Error(`Xero API error: ${response.status} - ${errorText}`);
    }

    const data: XeroContactsResponse = await response.json();
    const contacts = data.Contacts || [];

    logger.info("XERO_CACHE", "Page fetched", { page, count: contacts.length });

    if (contacts.length === 0) {
      hasMorePages = false;
    } else {
      // Normalize and add to collection
      const normalized = contacts.map(normalizeContact);
      allContacts.push(...normalized);
      page++;
    }

    // Safety limit: max 100 pages (10,000 contacts)
    // With server-side filtering, we should rarely hit this
    if (page > 100) {
      logger.warn("XERO_CACHE", "Reached page limit (100), stopping pagination");
      hasMorePages = false;
    }
  }

  const duration = Date.now() - startTime;
  logger.info("XERO_CACHE", searchTerm ? "Fetched filtered contacts" : "Fetched all contacts", {
    totalContacts: allContacts.length,
    durationMs: duration,
    searchTerm: searchTerm || "none"
  });

  return allContacts;
}

/**
 * Get all Xero contacts (cached)
 *
 * Returns cached contacts if available and fresh (< 10 minutes old).
 * Otherwise, fetches fresh data from Xero API with pagination.
 *
 * @param userId - Clerk user ID for authentication
 * @returns Array of all Xero contacts
 */
export async function getAllXeroContacts(userId: string): Promise<ExtendedContact[]> {
  const now = Date.now();

  // Check cache
  const cached = contactsCache.get(userId);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    const age = Math.round((now - cached.fetchedAt) / 1000);
    logger.info("XERO_CACHE", "Using cached contacts", {
      count: cached.contacts.length,
      ageSeconds: age
    });
    return cached.contacts;
  }

  // Cache miss or expired - fetch fresh data
  logger.info("XERO_CACHE", "Cache miss or expired, fetching fresh data");
  const contacts = await fetchAllContactsFromXero(userId);

  // Store in cache
  contactsCache.set(userId, {
    contacts,
    fetchedAt: now,
    userId,
  });

  return contacts;
}

/**
 * Search Xero contacts with server-side filtering
 *
 * PERFORMANCE OPTIMIZATION: Uses Xero's where clause to filter server-side.
 * This avoids fetching all contacts and searching locally.
 *
 * This function does NOT use cache - it goes directly to Xero API with search filter.
 * For sub-2-second response times, we bypass the full contacts cache.
 *
 * @param userId - Clerk user ID for authentication
 * @param searchTerm - Search term to filter by name
 * @returns Array of contacts matching search term
 */
export async function searchXeroContacts(userId: string, searchTerm: string): Promise<ExtendedContact[]> {
  logger.info("XERO_CACHE", "Server-side contact search", { searchTerm, userId });

  if (!searchTerm || searchTerm.trim().length < 2) {
    logger.info("XERO_CACHE", "Search term too short, returning empty", {
      searchTermLength: searchTerm?.length || 0
    });
    return [];
  }

  // Fetch with server-side filtering (no caching)
  const contacts = await fetchAllContactsFromXero(userId, searchTerm);

  logger.info("XERO_CACHE", "Server-side search completed", {
    resultCount: contacts.length,
    searchTerm
  });

  return contacts;
}

/**
 * Get supplier-only Xero contacts (cached)
 *
 * PERFORMANCE OPTIMIZATION: Returns pre-filtered supplier contacts only.
 * This avoids filtering all contacts on every supplier search request.
 *
 * Returns cached suppliers if available and fresh (< 10 minutes old).
 * Otherwise, fetches all contacts and filters to suppliers only.
 *
 * @param userId - Clerk user ID for authentication
 * @returns Array of supplier contacts only (isSupplier === true)
 */
export async function getSupplierContacts(userId: string): Promise<ExtendedContact[]> {
  const now = Date.now();

  // Check supplier cache first
  const cached = supplierCache.get(userId);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    const age = Math.round((now - cached.fetchedAt) / 1000);
    logger.info("XERO_CACHE", "Using cached suppliers", {
      count: cached.contacts.length,
      ageSeconds: age
    });
    return cached.contacts;
  }

  // Cache miss or expired - fetch all contacts and filter to suppliers
  logger.info("XERO_CACHE", "Supplier cache miss or expired, fetching and filtering suppliers");
  const allContacts = await getAllXeroContacts(userId);

  // Filter to suppliers only (uses pre-computed isSupplier flag)
  const suppliers = allContacts.filter((contact) => contact.isSupplier);

  logger.info("XERO_CACHE", "Filtered suppliers", {
    supplierCount: suppliers.length,
    totalContacts: allContacts.length
  });

  // Store in supplier cache
  supplierCache.set(userId, {
    contacts: suppliers,
    fetchedAt: now,
    userId,
  });

  return suppliers;
}

/**
 * Clear cache for a specific user (useful for testing or manual refresh)
 */
export function clearContactsCache(userId: string): void {
  contactsCache.delete(userId);
  logger.info("XERO_CACHE", "Cleared cache for user", { userId });
}

/**
 * Clear all caches (useful for testing)
 */
export function clearAllContactsCaches(): void {
  contactsCache.clear();
  supplierCache.clear();
  logger.info("XERO_CACHE", "Cleared all caches (contacts + suppliers)");
}
