# Xata Schema Setup - Manual Guide

## ❌ API Schema Upload Blocked

After extensive testing, programmatic schema upload via Xata REST API is not possible for the following reasons:

1. **Schema endpoints return 404** - POST/PUT to `/schema` endpoint not found
2. **Migrations require Postgres** - Migration API only works with `postgresEnabled: true`
3. **CLI requires TTY** - All schema commands need interactive terminal
4. **Operations endpoint invalid** - `/schema/apply` rejects the operations format

**Confirmed Working:**
- ✅ Database exists: `Club19SalesOS`
- ✅ Branch exists: `main` (temp_init table confirmed via query)
- ✅ Data operations work (GET /schema, POST /query)
- ✅ Schema *read* works, but schema *write* requires web UI

---

## ✅ SOLUTION: Manual Table Creation (10 minutes)

You'll need to create 6 tables via the Xata web UI. Follow this step-by-step guide.

### Access Your Database

Visit: https://app.xata.io/workspaces/Oliver-Timmerman-s-workspace-d3730u/dbs/Club19SalesOS

---

## TABLE 1: Shoppers

1. Click **"Add a table"**
2. Name: `Shoppers`
3. Add 4 columns:

| Column Name | Type | Notes |
|------------|------|-------|
| name | String | - |
| email | String | - |
| commission_scheme | Text | Long text field |
| active | Boolean | - |

---

## TABLE 2: Buyers

1. Click **"Add a table"**
2. Name: `Buyers`
3. Add 3 columns:

| Column Name | Type | Notes |
|------------|------|-------|
| name | String | - |
| email | String | - |
| xero_contact_id | String | - |

---

## TABLE 3: Suppliers

1. Click **"Add a table"**
2. Name: `Suppliers`
3. Add 3 columns:

| Column Name | Type | Notes |
|------------|------|-------|
| name | String | - |
| email | String | - |
| xero_contact_id | String | - |

---

## TABLE 4: Introducers

1. Click **"Add a table"**
2. Name: `Introducers`
3. Add 2 columns:

| Column Name | Type | Notes |
|------------|------|-------|
| name | String | - |
| commission_percent | Float | Decimal number |

---

## TABLE 5: CommissionBands

1. Click **"Add a table"**
2. Name: `CommissionBands`
3. Add 4 columns:

| Column Name | Type | Notes |
|------------|------|-------|
| band_type | String | - |
| min_threshold | Float | - |
| max_threshold | Float | - |
| commission_percent | Float | - |

---

## TABLE 6: Sales (32 columns + 5 relationships)

1. Click **"Add a table"**
2. Name: `Sales`
3. Add these columns **in order**:

### Core Identifiers
| Column Name | Type |
|------------|------|
| sale_reference | String |
| sale_date | DateTime |

### Relationships (Links to other tables)
| Column Name | Type | Link To |
|------------|------|---------|
| shopper | Link | Shoppers |
| buyer | Link | Buyers |
| supplier | Link | Suppliers |
| introducer | Link | Introducers |
| commission_band | Link | CommissionBands |

### Item Metadata
| Column Name | Type |
|------------|------|
| brand | String |
| category | String |
| item_title | String |
| quantity | Integer |

### Financial Fields
| Column Name | Type |
|------------|------|
| sale_amount_inc_vat | Float |
| sale_amount_ex_vat | Float |
| buy_price | Float |
| card_fees | Float |
| shipping_cost | Float |
| direct_costs | Float |

### Economics
| Column Name | Type |
|------------|------|
| implied_shipping | Float |
| gross_margin | Float |
| commissionable_margin | Float |

### Xero Integration
| Column Name | Type |
|------------|------|
| currency | String |
| branding_theme | String |
| xero_invoice_number | String |
| xero_invoice_id | String |
| xero_invoice_url | String |
| invoice_status | String |
| invoice_paid_date | DateTime |

### Commission Logic
| Column Name | Type |
|------------|------|
| commission_locked | Boolean |
| commission_paid | Boolean |
| commission_lock_date | DateTime |
| commission_paid_date | DateTime |

### Notes
| Column Name | Type |
|------------|------|
| internal_notes | Text |

---

## After Creating All Tables

### 1. Delete temp_init table (optional cleanup)
- Click on `temp_init` table
- Click **Settings** → **Delete table**

### 2. Generate TypeScript Client

Run in your terminal:
```bash
cd "/Users/olivertimmerman/Documents/Converso/Club-19-Final"
npx xata codegen
```

This will generate `src/xata.ts` with full TypeScript types for all your tables.

### 3. Verify Setup

Check that the following file was created:
- `src/xata.ts` - TypeScript client with all table types

### 4. Test the Connection

Create a test file: `test-xata.ts`
```typescript
import { getXataClient } from "./src/xata";

const xata = getXataClient();

async function test() {
  // Query shoppers
  const shoppers = await xata.db.Shoppers.getMany();
  console.log("Shoppers:", shoppers);

  // Query sales
  const sales = await xata.db.Sales.getMany();
  console.log("Sales:", sales);
}

test();
```

Run with: `npx tsx test-xata.ts`

---

## 🎯 What You Get

Once setup is complete, you'll have:

✅ **6 fully connected tables** with proper relationships
✅ **TypeScript client** with full type safety
✅ **Sales table** ready to receive Make.com webhook data
✅ **Commission tracking** with locking/payment fields
✅ **Xero integration** metadata fields
✅ **Real-time queries** from your Next.js app

---

## 💻 Integration with Your App

After codegen completes, integrate with your existing invoice flow:

### Update `/app/api/xero/invoices/route.ts`

Add Xata sync after Make.com sync (around line 301):

```typescript
// Existing Make.com sync
await syncSaleToMake(salePayload);

// NEW: Also sync to Xata database
import { syncSaleToXata } from "@/lib/xata-sync";
await syncSaleToXata(salePayload);
```

### Create `/lib/xata-sync.ts`

```typescript
import { getXataClient } from "@/src/xata";
import type { SalePayload } from "@/lib/types/sale";

export async function syncSaleToXata(payload: SalePayload) {
  const xata = getXataClient();

  try {
    // 1. Find or create Shopper
    let shopper = await xata.db.Shoppers
      .filter({ name: payload.shopperName })
      .getFirst();

    if (!shopper) {
      shopper = await xata.db.Shoppers.create({
        name: payload.shopperName,
        email: payload.shopperEmail || "",
        active: true,
      });
    }

    // 2. Find or create Buyer
    let buyer = await xata.db.Buyers
      .filter({ name: payload.buyerName })
      .getFirst();

    if (!buyer) {
      buyer = await xata.db.Buyers.create({
        name: payload.buyerName,
        email: payload.buyerEmail || "",
        xero_contact_id: payload.buyerXeroId || "",
      });
    }

    // 3. Find or create Supplier
    let supplier = await xata.db.Suppliers
      .filter({ name: payload.supplierName })
      .getFirst();

    if (!supplier) {
      supplier = await xata.db.Suppliers.create({
        name: payload.supplierName,
        email: payload.supplierEmail || "",
        xero_contact_id: payload.supplierXeroId || "",
      });
    }

    // 4. Create Sale record
    await xata.db.Sales.create({
      sale_reference: payload.saleReference,
      sale_date: new Date(payload.saleDate),

      // Relationships
      shopper: shopper.id,
      buyer: buyer.id,
      supplier: supplier.id,

      // Item metadata
      brand: payload.brand || "",
      category: payload.category || "",
      item_title: payload.itemTitle || "",
      quantity: payload.quantity || 1,

      // Financials
      sale_amount_inc_vat: payload.saleAmountIncVat,
      sale_amount_ex_vat: payload.saleAmountExVat,
      buy_price: payload.buyPrice,
      card_fees: payload.cardFees || 0,
      shipping_cost: payload.shippingCost || 0,
      direct_costs: payload.directCosts || 0,

      // Economics
      implied_shipping: payload.impliedShipping || 0,
      gross_margin: payload.grossMargin,
      commissionable_margin: payload.commissionableMargin,

      // Xero
      currency: payload.currency || "GBP",
      branding_theme: payload.brandingTheme || "",
      xero_invoice_number: payload.xeroInvoiceNumber || "",
      xero_invoice_id: payload.xeroInvoiceId || "",
      xero_invoice_url: payload.xeroInvoiceUrl || "",
      invoice_status: payload.invoiceStatus || "DRAFT",

      // Commission tracking
      commission_locked: false,
      commission_paid: false,

      // Notes
      internal_notes: payload.notes || "",
    });

    console.log("[XATA SYNC] ✓ Sale synced to database");
  } catch (error) {
    console.error("[XATA SYNC] ❌ Failed:", error);
    // Don't throw - this is non-critical background sync
  }
}
```

---

## 🔧 Troubleshooting

### TypeScript Client Not Generated

```bash
# Check Xata CLI version
npx xata --version

# Regenerate client
npx xata codegen --force
```

### "Module not found: @/src/xata"

Check that:
1. File exists: `src/xata.ts`
2. tsconfig.json has paths configured
3. Run `npm run build` to verify TypeScript compilation

### "Xata client not configured"

Check `.env.local` contains:
```bash
XATA_API_KEY=xau_46fql8kZYCHBseUclLr72fFYBbbdsuRQ1
```

---

## 📊 Current Project Status

✅ Authentication configured
✅ Database created (`Club19SalesOS`)
✅ Branch initialized (`main`)
✅ Configuration files ready (`.xatarc`, `.env.local`)
⏳ **YOU ARE HERE** → Create tables manually (10 mins)
⏳ Generate TypeScript client (`npx xata codegen`)
⏳ Integrate with invoice flow

---

## 📝 Summary

**Why manual setup?**
- Xata REST API for schema management requires web UI initialization
- CLI tools require interactive terminal (TTY)
- Data operations work fine, but schema *creation* must be done via UI

**Time estimate:** 10-15 minutes to create all tables manually

**After setup:** Full programmatic access via TypeScript client for all CRUD operations

**Next step:** Open the Xata web UI and start creating the 6 tables using the specifications above.
