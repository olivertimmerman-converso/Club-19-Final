# Club 19 Sales OS - Comprehensive Codebase Audit Report

*Prepared for strategic planning of new features*

---

## 1. Permissions & Roles System

### Role Definitions
**Source:** [lib/permissions.ts](lib/permissions.ts)

```typescript
type StaffRole = "superadmin" | "founder" | "operations" | "admin" | "finance" | "shopper"
```

### Role Mapping to People
| Role | Person | Access Level |
|------|--------|--------------|
| `superadmin` | Oliver | Full system access |
| `founder` | Sophie | Business operations, Xero access |
| `operations` | Alys | Reconciliation workflow, most reports |
| `admin` | (unused) | Administrator features |
| `finance` | (TBD) | Financial data, read-only on some pages |
| `shopper` | Hope, Mary Clair | Dashboard, sales, clients, trade only |

### Role Checking Implementation
**Three layers of protection:**

1. **Middleware** ([middleware.ts](middleware.ts)) - Route-level protection
   - Fetches `publicMetadata.staffRole` from Clerk
   - Redirects to `/unauthorised` if access denied

2. **Server Components** ([lib/getUserRole.ts](lib/getUserRole.ts)) - SSR access control
   ```typescript
   const role = await getUserRole();
   if (role !== "superadmin") { redirect("/unauthorised"); }
   ```

3. **API Routes** - Per-endpoint authorization
   ```typescript
   if (!["superadmin", "operations", "founder"].includes(role)) {
     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
   }
   ```

### Key Permission Function
```typescript
// lib/permissions.ts
export function canAccessRoute(role: StaffRole, pathname: string): boolean
```

### Route Permissions Matrix (Key Routes)

| Route | superadmin | founder | operations | finance | shopper |
|-------|------------|---------|------------|---------|---------|
| `/dashboard` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/sales` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/clients` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/trade` (Atelier) | ✅ | ✅ | ✅ | ❌ | ✅ |
| `/suppliers` | ✅ | ❌ | ✅ | ✅ | ❌ |
| `/shoppers` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/finance` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/admin/sync` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/admin/sync/adopt` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/admin` | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 2. Adopt Invoice Flow

### Files Involved
| Layer | File |
|-------|------|
| Page (List) | [app/(os)/admin/sync/page.tsx](app/(os)/admin/sync/page.tsx) |
| Page (Form) | [app/(os)/admin/sync/adopt/[invoiceId]/page.tsx](app/(os)/admin/sync/adopt/[invoiceId]/page.tsx) |
| Client UI | [app/(os)/admin/sync/AdoptInvoiceClient.tsx](app/(os)/admin/sync/AdoptInvoiceClient.tsx) |
| API (Adopt) | [app/api/sales/adopt/route.ts](app/api/sales/adopt/route.ts) |
| API (Invoice) | [app/api/xero/invoice/[invoiceId]/route.ts](app/api/xero/invoice/[invoiceId]/route.ts) |

### Permission Requirements
**Allowed roles:** `superadmin`, `founder`, `operations`, `admin`

### Step-by-Step Flow

```
1. User navigates to /admin/sync
   └─→ Shows unallocated invoices (needs_allocation = true)

2. User clicks "Adopt" on an invoice
   └─→ Navigates to /admin/sync/adopt/[invoiceId]

3. Page fetches invoice from Xero
   └─→ GET /api/xero/invoice/[invoiceId]
   └─→ Returns: invoiceNumber, clientName, total, lineItems, status

4. User fills in missing details:
   ├─ Shopper (dropdown) - REQUIRED
   ├─ Supplier (dropdown) - REQUIRED
   ├─ Buy Price - REQUIRED
   ├─ Brand - REQUIRED
   ├─ Category - REQUIRED
   └─ Description - REQUIRED

5. User clicks "Adopt Invoice"
   └─→ POST /api/sales/adopt

6. API creates Sale record:
   ├─ Finds/creates Buyer from Xero contact
   ├─ Generates sale reference (C19-XXXX)
   ├─ Calculates margins
   ├─ Sets source = "adopted"
   ├─ Sets needsAllocation = false
   └─ Returns saleId

7. Redirect to /sales/[saleId]
```

### Data Created/Updated

**Sales table (INSERT):**
- `source: "adopted"` - marks origin
- `needsAllocation: false` - marks as fully allocated
- All financial fields populated
- Xero fields linked

**Buyers table (INSERT if new):**
- Auto-created from Xero contact if not exists

### Validation Guards
1. Authentication required (Clerk userId)
2. Role check (superadmin/founder/operations/admin)
3. Required fields validation (shopperId, supplierId, buyPrice, brand, category)
4. Duplicate check (prevents re-adopting same invoice)
5. Xero token validation
6. Invoice existence check in Xero

---

## 3. Shopper Assignment

### Database Schema

**Sales → Shopper Link:**
```typescript
// db/schema.ts line 155
shopperId: uuid("shopper_id").references(() => shoppers.id)
```

**Buyers → Owner Link:**
```typescript
// db/schema.ts line 56
ownerId: uuid("owner_id").references(() => shoppers.id)
ownerChangedAt: timestamp("owner_changed_at")
ownerChangedBy: text("owner_changed_by")
```

### Assignment by Flow

| Flow | How Shopper is Assigned |
|------|------------------------|
| **Sales Atelier** | Auto-assigned from authenticated user's Clerk profile |
| **Xero Adopt** | **REQUIRED in form** - user must select shopper |
| **Xero Import (auto)** | **NOT ASSIGNED** - creates with `needsAllocation: true` |

### Sales Atelier Auto-Assignment
```typescript
// app/api/xero/invoices/route.ts lines 319-326
const user = await clerkClient().users.getUser(userId);
shopperName = user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress;
// Then passed to createSaleFromAppPayload → getOrCreateShopperByName()
```

### UI for Changing Shopper
- **Sale Detail Page:** Display only (no edit UI)
- **Backend API:** `PATCH /api/sales/[id]` with `{ shopper: shopperId }` works
- **Access:** Admin+ role required

**Gap identified:** No UI exists to change shopper on existing sale.

---

## 4. Sales Data Completeness

### Complete Sales Table Fields (50+ columns)

**Identifiers:**
- `id`, `sale_reference`, `sale_date`

**Foreign Keys:**
- `shopper_id`, `buyer_id`, `supplier_id`, `introducer_id`, `commission_band_id`, `owner_id`

**Item Details:**
- `brand`, `category`, `item_title`, `quantity`, `currency`, `branding_theme`

**Financial - Sale Amounts:**
- `sale_amount_inc_vat`, `sale_amount_ex_vat`, `buy_price`
- `card_fees`, `shipping_cost`, `direct_costs`
- `gross_margin`, `commissionable_margin`, `implied_shipping`

**Xero Integration:**
- `xero_invoice_number`, `xero_invoice_id`, `xero_invoice_url`
- `invoice_status`, `invoice_paid_date`, `xero_payment_date`

**Commission:**
- `commission_amount`, `commission_split_introducer`, `commission_split_shopper`
- `commission_locked`, `commission_paid`, `commission_lock_date`, `commission_paid_date`

**Status & Tracking:**
- `status`, `source`, `needs_allocation`, `error_flag`, `error_message`
- `deleted_at`, `dismissed`, `dismissed_at`, `dismissed_by`

### Field Population Comparison

| Field | Xero Adopt | Sales Atelier |
|-------|------------|---------------|
| `source` | "adopted" | "atelier" |
| `shopperId` | From form (required) | Auto from user |
| `supplierId` | From form (required) | Auto from name |
| `brand` | From form (required) | From wizard |
| `category` | From form (required) | From wizard |
| `buyPrice` | From form (required) | From wizard |
| `cardFees` | Default 0 | From wizard |
| `shippingCost` | Default 0 | From wizard |
| `brandingTheme` | NOT SET | From tax logic |
| `buyerType` | NOT SET | From wizard |
| `grossMargin` | Calculated | Calculated |
| `commissionableMargin` | Calculated | Calculated |

### "Missing Data" Fields (Exact Column Names)
| Business Field | Column Name | Type |
|----------------|-------------|------|
| Supplier | `supplier_id` | UUID FK |
| Category | `category` | text |
| Brand | `brand` | text |
| VAT/Branding Theme | `branding_theme` | text |
| Shipping Cost | `shipping_cost` | doublePrecision |
| Card Fees | `card_fees` | doublePrecision |
| Item Description | `item_title` | text |
| Buyer Type | `buyer_type` | text |

### Error/Attention Flagging
- **`error_flag`** (boolean) - Set when validation or commission errors occur
- **`error_message`** (JSONB array) - Contains error details
- **Errors table** - Linked via `saleId`, tracks severity (low/medium/high/critical)

### Shopper's Sales View
**Page:** [app/(os)/staff/shopper/sales/page.tsx](app/(os)/staff/shopper/sales/page.tsx)

**Displays:**
- Sale reference, buyer, supplier, status, amount, margin %, commission
- Error/warning count with icon indicator
- Filters: search, status, buyer type

---

## 5. Xero Sync Flow

### Three Sync Mechanisms

| Mechanism | Endpoint | Trigger | Purpose |
|-----------|----------|---------|---------|
| **Webhook** | `POST /api/xero/webhooks` | Real-time from Xero | Immediate invoice updates |
| **Cron** | `GET /api/cron/refresh-xero` | Every 10 minutes | Token refresh only |
| **Manual** | `POST /api/sync/xero-invoices` | Admin button click | Fetch last 60 days |

### Data From Xero vs Manual Entry

**From Xero (auto-populated):**
- `xeroInvoiceId`, `xeroInvoiceNumber`
- `saleDate`, `saleAmountIncVat`, `saleAmountExVat`
- `currency`, `invoiceStatus`, `invoicePaidDate`
- `buyerId` (auto-created from contact)
- `itemTitle` (from first line item)

**Manual Entry Required:**
- `shopperId` - Must be assigned via allocation
- `buyPrice` - Set to 0, needs entry
- `brand` - "Unknown" default
- `category` - "Unknown" default
- All commission fields

### Unallocated Invoice Tracking

**Query:**
```sql
SELECT * FROM sales
WHERE needs_allocation = true
  AND deleted_at IS NULL
  AND (dismissed = false OR dismissed IS NULL)
```

**UI:** Admin Sync page shows unallocated invoices with:
- Allocate dropdown (assign shopper)
- Adopt button (full data entry)
- Dismiss button (hide test/duplicate invoices)

---

## 6. Sales Atelier Flow

### Entry Point
[app/(os)/trade/new/page.tsx](app/(os)/trade/new/page.tsx)

### 5-Step Wizard

| Step | Component | Data Captured |
|------|-----------|---------------|
| **0: Item Details** | `StepItemDetails.tsx` | Brand, Category, Description, Quantity (up to 10 items) |
| **1: Pricing** | `StepPricing.tsx` | Supplier, Buy Price, Sell Price per item |
| **2: Client** | `StepSupplierBuyer.tsx` | Buyer Name, Buyer Type, Xero Contact ID, Payment Method, Delivery Country |
| **3: Logistics & Tax** | `StepLogisticsTax.tsx` | Item Location, Delivery Address, UK Purchase Type, Direct Ship, Landed Delivery |
| **4: Review** | `StepReview.tsx` | Due Date, Notes, Final Review |

### Tax Logic (Step 3)
Determines `branding_theme` and VAT treatment based on:
- Item location (UK vs Outside UK)
- Delivery address (UK vs Outside UK)
- Purchase type (Retail vs Margin Scheme)
- Direct ship and landed delivery flags

### Submission
**API:** `POST /api/trade/create`

**Creates:**
1. Xero invoice (directly via Xero API)
2. Sales record with `source: "atelier"`
3. Buyer record (if new)
4. Supplier record (if new)

### Key Difference from Adopt
| Aspect | Atelier | Adopt |
|--------|---------|-------|
| Invoice | Creates NEW in Xero | Uses EXISTING |
| Data Entry | Full 5-step wizard | Minimal form |
| Shopper | Auto from user | Required in form |
| Tax Treatment | Auto-determined | Not set |

---

## 7. UI Components & Pages

### All Pages Under app/(os)/

| Route | Description |
|-------|-------------|
| `/dashboard` | Role-based dashboard (6 variants) |
| `/sales` | Sales overview with inline shopper editing |
| `/sales/[id]` | Individual sale detail |
| `/clients` | Client directory with owner assignment |
| `/clients/[id]` | Individual client detail |
| `/suppliers` | Supplier management |
| `/suppliers/[id]` | Individual supplier detail |
| `/shoppers` | Shopper performance management |
| `/shoppers/[id]` | Individual shopper detail |
| `/invoices` | Invoice management with status filters |
| `/finance` | Commission tracking, P&L overview |
| `/trade/new` | Sales Atelier (5-step wizard) |
| `/trade/success` | Invoice creation success |
| `/admin` | System administration (superadmin only) |
| `/admin/sync` | Xero sync management |
| `/admin/sync/adopt/[invoiceId]` | Adopt invoice form |
| `/admin/deleted-sales` | Soft-deleted sales management |
| `/legacy` | Historical trade analytics |
| `/legacy-xero` | Xero import data dashboard |
| `/xero-health` | Xero integration status |
| `/debug-role` | Debug user role (dev only) |

### Key Shared Components

**Layout:**
- `OSLayout.tsx` - Main wrapper with sidebar
- `Sidebar.tsx` - Role-based navigation (black+gold premium)
- `OSNav.tsx` - Top nav with user profile
- `XeroStatusBanner.tsx` - Xero disconnection warning

**Dashboards (6 variants):**
- `ShopperDashboard.tsx`, `AdminDashboard.tsx`, `FinanceDashboard.tsx`
- `FounderDashboard.tsx`, `OperationsDashboard.tsx`, `SuperadminDashboard.tsx`

**Trade Wizard:**
- `StepItemDetails.tsx`, `StepPricing.tsx`, `StepSupplierBuyer.tsx`
- `StepLogisticsTax.tsx`, `StepReview.tsx`

### Navigation Structure
- Fixed sidebar (w-64) with role-filtered menu items
- Menu items defined in `ROUTE_PERMISSIONS`
- Active route highlighting
- Collapsible nested menus
- Mobile-responsive drawer overlay

---

## Summary: Key Gaps Identified

1. **Shopper Assignment on Adopt:** Required in form but no UI to change after creation
2. **Branding Theme (VAT):** Not set during Xero adoption - critical for correct VAT calculation
3. **Buyer Type:** Not captured during adoption - affects commission rules
4. **No "Incomplete Sale" Queue:** Sales with `needsAllocation=false` but missing data (brand="Unknown") not flagged
5. **Shopper Edit UI:** No UI exists to change shopper on existing sale (API supports it)
6. **Xero Import Data Quality:** Auto-imported invoices have minimal data, require manual enrichment

---

*Report generated from codebase audit - February 2026*
