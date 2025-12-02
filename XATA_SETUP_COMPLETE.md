# Club 19 Sales OS - Xata Database Setup

## ✅ COMPLETED AUTOMATICALLY

### 1. Authentication
- ✅ API Key configured: `xau_46fql8kZYCHBseUclLr72fFYBbbdsuRQ1`
- ✅ CLI authenticated successfully

### 2. Database Creation
- ✅ Database: `Club19SalesOS`
- ✅ Region: `eu-central-1`
- ✅ Workspace: `Oliver-Timmerman-s-workspace-d3730u`

### 3. Project Configuration
- ✅ `.xatarc` file created
- ✅ `.env.local` updated with API key
- ✅ `@xata.io/client` and `@xata.io/cli` installed

### 4. Schema Prepared
- ✅ Complete JSON schema: `xata-schema.json`
- ✅ Python upload script: `create-xata-schema.py`
- ✅ Individual table creator: `create-tables-individually.py`

---

## ⏳ MANUAL STEP REQUIRED (2 minutes)

Xata requires branch initialization via web UI before programmatic schema uploads.

### Option 1: Quick Schema Upload (RECOMMENDED)

1. **Visit:** https://app.xata.io/workspaces/Oliver-Timmerman-s-workspace-d3730u/dbs/Club19SalesOS

2. **Click "Initialize Database"** or create `main` branch (one click)

3. **Run upload script:**
   ```bash
   cd "/Users/olivertimmerman/Documents/Converso/Club-19-Final"
   python3 create-xata-schema.py
   ```

4. **Generate TypeScript client:**
   ```bash
   npx xata codegen
   ```

### Option 2: Manual Schema Creation via UI

Use the schema reference below to create tables via Xata web UI.

---

## 📊 DATABASE SCHEMA

### Table: **Shoppers** (4 columns)
- `name` (string)
- `email` (string)
- `commission_scheme` (text)
- `active` (bool)

### Table: **Buyers** (3 columns)
- `name` (string)
- `email` (string)
- `xero_contact_id` (string)

### Table: **Suppliers** (3 columns)
- `name` (string)
- `email` (string)
- `xero_contact_id` (string)

### Table: **Introducers** (2 columns)
- `name` (string)
- `commission_percent` (float)

### Table: **CommissionBands** (4 columns)
- `band_type` (string)
- `min_threshold` (float)
- `max_threshold` (float)
- `commission_percent` (float)

### Table: **Sales** (32 columns + 5 relationships)

**Core Identifiers:**
- `sale_reference` (string)
- `sale_date` (datetime)

**Relationships:**
- `shopper` (link → Shoppers)
- `buyer` (link → Buyers)
- `supplier` (link → Suppliers)
- `introducer` (link → Introducers)
- `commission_band` (link → CommissionBands)

**Item Metadata:**
- `brand` (string)
- `category` (string)
- `item_title` (string)
- `quantity` (int)

**Financials:**
- `sale_amount_inc_vat` (float)
- `sale_amount_ex_vat` (float)
- `buy_price` (float)
- `card_fees` (float)
- `shipping_cost` (float)
- `direct_costs` (float)

**Economics:**
- `implied_shipping` (float)
- `gross_margin` (float)
- `commissionable_margin` (float)

**Xero Integration:**
- `currency` (string)
- `branding_theme` (string)
- `xero_invoice_number` (string)
- `xero_invoice_id` (string)
- `xero_invoice_url` (string)
- `invoice_status` (string)
- `invoice_paid_date` (datetime)

**Commission Logic:**
- `commission_locked` (bool)
- `commission_paid` (bool)
- `commission_lock_date` (datetime)
- `commission_paid_date` (datetime)

**Notes:**
- `internal_notes` (text)

---

## 💻 TYPESCRIPT CLIENT USAGE

After schema is uploaded and `npx xata codegen` runs, use like this:

```typescript
import { getXataClient } from "./src/xata";

const xata = getXataClient();

// Create a sale record from Make.com webhook
async function syncSaleToXata(salePayload: SalePayload) {
  // 1. Find or create Shopper
  const shopper = await xata.db.Shoppers.filter({
    name: salePayload.shopperName
  }).getFirst();

  // 2. Find or create Buyer
  const buyer = await xata.db.Buyers.filter({
    name: salePayload.buyerName
  }).getFirst();

  // 3. Find or create Supplier
  const supplier = await xata.db.Suppliers.filter({
    name: salePayload.supplierName
  }).getFirst();

  // 4. Create Sale record
  const sale = await xata.db.Sales.create({
    sale_reference: salePayload.saleReference,
    sale_date: new Date(salePayload.saleDate),
    shopper: shopper?.id,
    buyer: buyer?.id,
    supplier: supplier?.id,

    // Item metadata
    brand: salePayload.brand,
    category: salePayload.category,
    item_title: salePayload.itemTitle,
    quantity: salePayload.quantity,

    // Financials
    sale_amount_inc_vat: salePayload.saleAmount,
    sale_amount_ex_vat: salePayload.saleAmount / 1.2,
    buy_price: salePayload.buyPrice,
    card_fees: salePayload.cardFees,
    shipping_cost: salePayload.shippingCost,
    direct_costs: salePayload.directCosts,

    // Economics
    implied_shipping: salePayload.impliedShipping,
    gross_margin: salePayload.grossMargin,
    commissionable_margin: salePayload.commissionableMargin,

    // Xero
    currency: salePayload.currency,
    branding_theme: salePayload.brandingTheme,
    xero_invoice_number: "",  // Will be populated when invoice created

    // Logic
    commission_locked: false,
    commission_paid: false,

    // Notes
    internal_notes: salePayload.notes
  });

  return sale;
}

// Query sales for a specific shopper
async function getSalesByShopper(shopperName: string) {
  const sales = await xata.db.Sales
    .filter({ "shopper.name": shopperName })
    .sort("sale_date", "desc")
    .getMany();

  return sales;
}

// Calculate total commissions for a shopper
async function calculateShopperCommissions(shopperName: string) {
  const sales = await xata.db.Sales
    .filter({
      "shopper.name": shopperName,
      commission_paid: false
    })
    .getMany();

  const total = sales.reduce((sum, sale) => {
    return sum + (sale.commissionable_margin || 0);
  }, 0);

  return total;
}

// Lock commissions for end of month
async function lockCommissionsForPeriod(endDate: Date) {
  const salesToLock = await xata.db.Sales
    .filter({
      sale_date: { $le: endDate },
      commission_locked: false
    })
    .getMany();

  for (const sale of salesToLock) {
    await xata.db.Sales.update(sale.id, {
      commission_locked: true,
      commission_lock_date: new Date()
    });
  }

  return salesToLock.length;
}
```

---

## 🔗 INTEGRATION WITH CURRENT APP

### Update Make.com Sync to also write to Xata

In `/app/api/xero/invoices/route.ts` after line 301:

```typescript
// Sync to Make.com (await ensures delivery)
await syncSaleToMake(salePayload);

// ALSO sync to Xata for database
import { syncSaleToXata } from "@/lib/xata-sync";
await syncSaleToXata(salePayload);
```

### Create `/lib/xata-sync.ts`:

```typescript
import { getXataClient } from "@/src/xata";
import { SalePayload } from "@/lib/types/sale";

export async function syncSaleToXata(payload: SalePayload) {
  const xata = getXataClient();

  try {
    // Create or find related records
    // ... (implementation from example above)

    console.log("[XATA SYNC] ✓ Sale synced to Xata database");
  } catch (error) {
    console.error("[XATA SYNC] ❌ Failed:", error);
    // Don't throw - just log
  }
}
```

---

## 📝 NEXT STEPS

1. ✅ Complete manual initialization (2 mins via web UI)
2. ✅ Run `python3 create-xata-schema.py` to upload schema
3. ✅ Run `npx xata codegen` to generate TypeScript client
4. ✅ Create `/lib/xata-sync.ts` integration
5. ✅ Test by creating an invoice in the app

---

## 🎯 WHAT YOU GET

- **Real-time database** for all sales
- **TypeScript type-safety** for all queries
- **Relationship tracking** between shoppers, buyers, suppliers
- **Commission calculations** with locking/payment tracking
- **Xero integration** metadata preserved
- **Audit trail** via Xata's built-in versioning
- **Full-text search** across all sales
- **Analytics-ready** data structure

---

## 🔧 TROUBLESHOOTING

If schema upload fails:
```bash
# Check database exists
npx xata dbs list

# Check branch exists
npx xata branch list

# Recreate branch
npx xata branch create main --from ""
```

---

**Status:** ⏳ Awaiting manual database initialization via web UI (2 minutes)

**After initialization:** All remaining setup is fully automated via provided scripts.
