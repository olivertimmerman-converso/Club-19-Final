/**
 * Club 19 Sales OS - Xero Integration Types
 *
 * Type definitions for Xero API integration
 */

/**
 * Xero OAuth token response
 */
export interface XeroTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  id_token?: string;
}

/**
 * Xero tenant connection
 */
export interface XeroConnection {
  id: string;
  tenantId: string;
  tenantType: string;
  tenantName: string;
  createdDateUtc?: string;
  updatedDateUtc?: string;
}

/**
 * Xero invoice types
 */
export type XeroInvoiceType = "ACCREC" | "ACCPAY";
export type XeroInvoiceStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "AUTHORISED"
  | "PAID"
  | "VOIDED"
  | "DELETED";

/**
 * Xero invoice structure
 */
export interface XeroInvoice {
  InvoiceID: string;
  InvoiceNumber: string;
  Type: XeroInvoiceType;
  Status: XeroInvoiceStatus;
  Contact: XeroContact;
  Date?: string;
  DueDate?: string;
  Total?: number;
  TotalTax?: number;
  SubTotal?: number;
  AmountDue?: number;
  AmountPaid?: number;
  CurrencyCode?: string;
  LineItems?: XeroLineItem[];
  BrandingThemeID?: string;
  Reference?: string;
  [key: string]: unknown; // Xero provides many optional fields
}

/**
 * Xero contact
 */
export interface XeroContact {
  ContactID: string;
  Name: string;
  EmailAddress?: string;
  FirstName?: string;
  LastName?: string;
  IsSupplier?: boolean;
  IsCustomer?: boolean;
  ContactStatus?: "ACTIVE" | "ARCHIVED";
  Addresses?: XeroAddress[];
  Phones?: XeroPhone[];
}

/**
 * Xero address
 */
export interface XeroAddress {
  AddressType: "POBOX" | "STREET" | "DELIVERY";
  AddressLine1?: string;
  AddressLine2?: string;
  City?: string;
  Region?: string;
  PostalCode?: string;
  Country?: string;
}

/**
 * Xero phone
 */
export interface XeroPhone {
  PhoneType: "DEFAULT" | "DDI" | "MOBILE" | "FAX";
  PhoneNumber?: string;
  PhoneAreaCode?: string;
  PhoneCountryCode?: string;
}

/**
 * Xero line item
 */
export interface XeroLineItem {
  LineItemID?: string;
  Description?: string;
  Quantity?: number;
  UnitAmount?: number;
  LineAmount?: number;
  TaxAmount?: number;
  AccountCode?: string;
  ItemCode?: string;
}

/**
 * Xero payment
 */
export interface XeroPayment {
  PaymentID: string;
  Invoice: {
    InvoiceID: string;
    InvoiceNumber: string;
  };
  Account: {
    AccountID: string;
    Code: string;
  };
  Date: string;
  Amount: number;
  CurrencyRate?: number;
  PaymentType?: string;
  Status?: "AUTHORISED" | "DELETED";
  Reference?: string;
}

/**
 * Xero branding theme
 */
export interface XeroBrandingTheme {
  BrandingThemeID: string;
  Name: string;
  LogoUrl?: string;
  Type?: string;
  SortOrder?: number;
  CreatedDateUTC?: string;
}

/**
 * Normalized contact for internal use
 */
export interface NormalizedContact {
  id: string;
  name: string;
  email?: string;
  type: "buyer" | "supplier";
  xeroContactId: string;
}
