-- ============================================================================
-- Club 19 Sales OS - PostgreSQL Schema Export
-- Generated for Xata Migration (Feb 2026)
--
-- This file contains all CREATE TABLE statements with proper FK ordering.
-- Tables are ordered so referenced tables are created before referencing tables.
-- ============================================================================

-- ============================================================================
-- SHOPPERS
-- Personal shoppers who facilitate sales and earn commission
-- ============================================================================
CREATE TABLE shoppers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT,
    commission_scheme TEXT,
    active BOOLEAN DEFAULT true,
    "xata.createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "xata.updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX shoppers_name_idx ON shoppers (name);

-- ============================================================================
-- SUPPLIERS
-- Vendors/suppliers who provide goods for sale
-- ============================================================================
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT,
    xero_contact_id TEXT,
    pending_approval BOOLEAN DEFAULT false,
    created_by TEXT,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    "xata.createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "xata.updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX suppliers_name_idx ON suppliers (name);
CREATE INDEX suppliers_xero_contact_id_idx ON suppliers (xero_contact_id);

-- ============================================================================
-- INTRODUCERS
-- Partners who introduce buyers and earn commission splits
-- ============================================================================
CREATE TABLE introducers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    commission_percent DOUBLE PRECISION,
    "xata.createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "xata.updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COMMISSION_BANDS
-- Tiered commission rates based on margin thresholds
-- ============================================================================
CREATE TABLE commission_bands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    band_type TEXT,
    min_threshold DOUBLE PRECISION,
    max_threshold DOUBLE PRECISION,
    commission_percent DOUBLE PRECISION,
    "xata.createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "xata.updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BUYERS
-- Customers who purchase goods (references shoppers for ownership)
-- ============================================================================
CREATE TABLE buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT,
    xero_contact_id TEXT,
    owner_id UUID REFERENCES shoppers(id),
    owner_changed_at TIMESTAMPTZ,
    owner_changed_by TEXT,
    "xata.createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "xata.updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX buyers_name_idx ON buyers (name);
CREATE INDEX buyers_xero_contact_id_idx ON buyers (xero_contact_id);

-- ============================================================================
-- SALES
-- Master sales table - core transaction records (~50 columns)
-- References: shoppers, buyers, suppliers, introducers, commission_bands
-- ============================================================================
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    sale_reference TEXT,
    sale_date TIMESTAMPTZ,

    -- Foreign Keys
    shopper_id UUID REFERENCES shoppers(id),
    buyer_id UUID REFERENCES buyers(id),
    supplier_id UUID REFERENCES suppliers(id),
    introducer_id UUID REFERENCES introducers(id),
    commission_band_id UUID REFERENCES commission_bands(id),
    owner_id UUID REFERENCES shoppers(id),

    -- Item Details
    brand TEXT,
    category TEXT,
    item_title TEXT,
    quantity INTEGER,
    currency TEXT,
    branding_theme TEXT,

    -- Financial - Sale Amounts
    sale_amount_inc_vat DOUBLE PRECISION,
    sale_amount_ex_vat DOUBLE PRECISION,
    buy_price DOUBLE PRECISION,
    card_fees DOUBLE PRECISION,
    shipping_cost DOUBLE PRECISION,
    direct_costs DOUBLE PRECISION,
    implied_shipping DOUBLE PRECISION,
    gross_margin DOUBLE PRECISION,
    commissionable_margin DOUBLE PRECISION,

    -- Xero Integration
    xero_invoice_number TEXT,
    xero_invoice_id TEXT,
    xero_invoice_url TEXT,
    invoice_status TEXT,
    invoice_paid_date TIMESTAMPTZ,
    xero_payment_date TIMESTAMPTZ,

    -- Commission
    commission_amount DOUBLE PRECISION,
    commission_split_introducer DOUBLE PRECISION,
    commission_split_shopper DOUBLE PRECISION,
    introducer_share_percent DOUBLE PRECISION,
    admin_override_commission_percent DOUBLE PRECISION,
    admin_override_notes JSONB,
    commission_locked BOOLEAN DEFAULT false,
    commission_paid BOOLEAN DEFAULT false,
    commission_lock_date TIMESTAMPTZ,
    commission_paid_date TIMESTAMPTZ,
    commission_clawback BOOLEAN,
    commission_clawback_date TIMESTAMPTZ,
    commission_clawback_reason TEXT,

    -- Introducer
    has_introducer BOOLEAN DEFAULT false,
    introducer_commission DOUBLE PRECISION,

    -- Payment Plan
    is_payment_plan BOOLEAN DEFAULT false,
    payment_plan_instalments INTEGER,

    -- Shipping
    shipping_method TEXT,
    shipping_cost_confirmed BOOLEAN,

    -- Status & Metadata
    status TEXT,
    source TEXT,
    buyer_type TEXT,
    needs_allocation BOOLEAN DEFAULT false,
    internal_notes TEXT,

    -- Error Tracking
    error_flag BOOLEAN,
    error_message JSONB,

    -- Soft Delete & Dismissal
    deleted_at TIMESTAMPTZ,
    dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    dismissed_by TEXT,

    -- JSON Fields
    linked_invoices JSONB,

    -- Timestamps
    "xata.createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "xata.updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX sales_sale_date_idx ON sales (sale_date);
CREATE INDEX sales_shopper_id_idx ON sales (shopper_id);
CREATE INDEX sales_buyer_id_idx ON sales (buyer_id);
CREATE INDEX sales_xero_invoice_id_idx ON sales (xero_invoice_id);
CREATE INDEX sales_deleted_at_idx ON sales (deleted_at);
CREATE INDEX sales_needs_allocation_idx ON sales (needs_allocation);
CREATE INDEX sales_source_idx ON sales (source);

-- ============================================================================
-- ERRORS
-- Error tracking for sales (validation errors, sync issues, etc.)
-- References: sales
-- ============================================================================
CREATE TABLE errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES sales(id),
    severity TEXT,
    source TEXT,
    message JSONB,
    timestamp TIMESTAMPTZ,
    resolved BOOLEAN DEFAULT false,
    resolved_by TEXT,
    "xata.createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "xata.updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX errors_sale_id_idx ON errors (sale_id);
CREATE INDEX errors_resolved_idx ON errors (resolved);

-- ============================================================================
-- PAYMENT_SCHEDULE
-- Payment plan instalments for sales with split payments
-- References: sales
-- ============================================================================
CREATE TABLE payment_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES sales(id),
    instalment_number INTEGER,
    due_date TIMESTAMPTZ,
    amount DOUBLE PRECISION,
    status TEXT,
    xero_invoice_id TEXT,
    xero_invoice_number TEXT,
    paid_date TIMESTAMPTZ,
    notes TEXT,
    "xata.createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "xata.updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX payment_schedule_sale_id_idx ON payment_schedule (sale_id);

-- ============================================================================
-- LINE_ITEMS
-- Individual line items within a sale (multi-item invoices)
-- References: sales, suppliers
-- ============================================================================
CREATE TABLE line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES sales(id),
    supplier_id UUID REFERENCES suppliers(id),
    line_number INTEGER,
    brand TEXT,
    category TEXT,
    description TEXT,
    quantity INTEGER,
    buy_price DOUBLE PRECISION,
    sell_price DOUBLE PRECISION,
    line_total DOUBLE PRECISION,
    line_margin DOUBLE PRECISION,
    "xata.createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "xata.updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX line_items_sale_id_idx ON line_items (sale_id);

-- ============================================================================
-- LEGACY_SUPPLIERS
-- Historical supplier data from pre-system imports
-- ============================================================================
CREATE TABLE legacy_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_clean TEXT,
    raw_variants JSONB,
    requires_review BOOLEAN,
    reason TEXT,
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    trade_count INTEGER,
    "xata.createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "xata.updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LEGACY_CLIENTS
-- Historical client data from pre-system imports
-- ============================================================================
CREATE TABLE legacy_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_clean TEXT,
    raw_variants JSONB,
    client_status TEXT,
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    trade_count INTEGER,
    requires_review BOOLEAN,
    "xata.createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "xata.updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LEGACY_TRADES
-- Historical trade records from pre-system imports
-- References: legacy_clients, legacy_suppliers
-- ============================================================================
CREATE TABLE legacy_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_date TIMESTAMPTZ,
    raw_client TEXT,
    raw_supplier TEXT,
    client_id UUID REFERENCES legacy_clients(id),
    supplier_id UUID REFERENCES legacy_suppliers(id),
    item TEXT,
    brand TEXT,
    category TEXT,
    source TEXT,
    buy_price DOUBLE PRECISION,
    sell_price DOUBLE PRECISION,
    margin DOUBLE PRECISION,
    invoice_number TEXT,
    raw_row JSONB,
    "xata.createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "xata.updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
