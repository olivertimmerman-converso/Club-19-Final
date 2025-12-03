# Legacy Dashboards - Setup & Testing Guide

## Overview

The Legacy Dashboards feature provides comprehensive analytics for Hope and MC's historical trade data (Dec 2024 - Oct 2025). The system includes:

- **Leadership Dashboard** (`/legacy`) - Full analytics for all historical data
- **Shopper Dashboard** (`/legacy/my-sales`) - Individual shopper analytics

## Current Status

✅ **Complete**:
- Legacy data utilities ([lib/legacyData.ts](lib/legacyData.ts))
- 10 reusable legacy components (cards, charts, tables, panels)
- Leadership dashboard page
- Shopper dashboard page
- TypeScript build successful with fallback logic

⏳ **Pending**:
- Creating legacy tables in Xata
- Importing 300 trades + 160 suppliers + 157 clients
- Regenerating Xata schema
- Enabling live data

---

## Setup Instructions

### 1. Create Legacy Tables in Xata

**Option A: Via Xata Web UI (Recommended)**

1. Go to https://app.xata.io
2. Open your `Club19SalesOS` database
3. Create three new tables with these schemas:

**Table: `legacy_suppliers`**
```
- supplier_clean (String)
- raw_variants (Multiple)
- requires_review (Boolean)
- reason (Text)
- first_seen (Datetime)
- last_seen (Datetime)
- trade_count (Integer)
```

**Table: `legacy_clients`**
```
- client_clean (String)
- raw_variants (Multiple)
- client_status (String)
- first_seen (Datetime)
- last_seen (Datetime)
- trade_count (Integer)
- requires_review (Boolean)
```

**Table: `legacy_trades`**
```
- invoice_number (String)
- trade_date (Datetime)
- raw_client (String)
- raw_supplier (String)
- client_id (Link to legacy_clients)
- supplier_id (Link to legacy_suppliers)
- item (Text)
- brand (String)
- category (String)
- buy_price (Float)
- sell_price (Float)
- margin (Float)
- source (String)
- raw_row (JSON)
```

**Option B: Via Xata CLI**

```bash
# Navigate to project directory
cd /Users/olivertimmerman/Documents/Converso/Club-19-Sales-OS

# Use the schema files already created
# (Manual creation required - see XATA_IMPORT_GUIDE.md)
```

### 2. Import Legacy Data

Once tables are created, import the prepared JSON files:

```bash
cd data/legacy-import

# Import in order (clients and suppliers first, then trades)
npx xata import legacy_suppliers.json --table=legacy_suppliers
npx xata import legacy_clients.json --table=legacy_clients
npx xata import legacy_trades.json --table=legacy_trades

# Optional: Seed live suppliers table
npx xata import suppliers_live_seed.json --table=suppliers
```

**Expected Results:**
- 160 suppliers imported
- 157 clients imported
- 300 trades imported

### 3. Regenerate Xata TypeScript Schema

After importing, regenerate the TypeScript client to include the new tables:

```bash
cd /Users/olivertimmerman/Documents/Converso/Club-19-Sales-OS
npx xata pull
```

This updates [src/xata.ts](src/xata.ts) with the legacy table types.

### 4. Enable Legacy Tables in Code

Edit [lib/legacyData.ts](lib/legacyData.ts:15):

```typescript
// Change this line from:
const LEGACY_TABLES_EXIST = false;

// To:
const LEGACY_TABLES_EXIST = true;
```

### 5. Remove TypeScript Suppressions

Once schema is regenerated, remove the `// @ts-expect-error` comments in [lib/legacyData.ts](lib/legacyData.ts):

```bash
# Remove all @ts-expect-error comments
sed -i '' '/\/\/ @ts-expect-error - Legacy tables/d' lib/legacyData.ts
```

### 6. Rebuild and Test

```bash
npm run build
npm run dev
```

---

## Testing Guide

### Test 1: Leadership Dashboard Access

**As Superadmin/Admin/Finance:**

1. Navigate to `/legacy`
2. ✅ Should see full dashboard with all data
3. ✅ Should see Review Flags panel (if any issues exist)
4. ✅ Should see data for both Hope and MC combined

**As Shopper:**

1. Navigate to `/legacy`
2. ✅ Should be redirected to `/legacy/my-sales`

### Test 2: Shopper Dashboard Access

**As Hope (Shopper):**

1. Navigate to `/legacy/my-sales`
2. ✅ Should see "My Legacy Sales" title
3. ✅ Should see only Hope's data (116 trades)
4. ✅ Should NOT see shopper selector
5. ✅ Summary cards should NOT show counts

**As MC (Shopper):**

1. Navigate to `/legacy/my-sales`
2. ✅ Should see "My Legacy Sales" title
3. ✅ Should see only MC's data (184 trades)
4. ✅ Should NOT see shopper selector
5. ✅ Summary cards should NOT show counts

**As Admin/Finance:**

1. Navigate to `/legacy/my-sales`
2. ✅ Should see shopper selector dropdown
3. ✅ Should be able to switch between "Hope" and "MC"
4. ✅ Should see selected shopper's data update

### Test 3: Data Accuracy

**Check Summary Cards:**
- Total Sales should match Excel totals
- Total Margin should match calculated margins
- Trade count should be accurate

**Check Charts:**
- Sales Over Time should show monthly progression
- Margin Over Time should show margin trends
- Category Breakdown should show top categories
- Supplier Contribution should show top suppliers

**Check Tables:**
- Recent Trades should show latest 20 trades
- Top Clients should show top 10 by sales
- Top Suppliers should show top 10 by sales

### Test 4: RBAC Verification

**Test Route Protection:**

```bash
# As shopper - should redirect to /legacy/my-sales
curl -H "Cookie: ..." https://your-domain.com/legacy

# As admin - should allow access
curl -H "Cookie: ..." https://your-domain.com/legacy

# As finance - should allow access
curl -H "Cookie: ..." https://your-domain.com/legacy
```

---

## Troubleshooting

### Issue: "Property 'legacy_trades' does not exist"

**Cause:** Xata schema hasn't been regenerated after table creation

**Fix:**
```bash
npx xata pull
```

### Issue: Empty Dashboards

**Cause:** `LEGACY_TABLES_EXIST` is still `false`

**Fix:** Set to `true` in [lib/legacyData.ts](lib/legacyData.ts:15)

### Issue: Import Errors

**Cause:** Tables created in wrong order or links not configured

**Fix:**
1. Delete all three tables
2. Recreate in order: suppliers, clients, trades
3. Ensure link fields point to correct tables

### Issue: Wrong Shopper Data

**Cause:** Shopper name detection not working

**Fix:** Check Clerk user `name` field matches "Hope" or "MC" (case-insensitive)

---

## File Structure

```
app/(os)/
├── legacy/
│   ├── page.tsx           # Leadership dashboard
│   └── my-sales/
│       └── page.tsx       # Shopper dashboard

components/legacy/
├── SummaryCards.tsx               # Summary metrics
├── SalesOverTimeChart.tsx         # Line chart (client component)
├── MarginOverTimeChart.tsx        # Line chart (client component)
├── CategoryBreakdownChart.tsx    # Bar chart (client component)
├── SupplierContributionChart.tsx # Bar chart (client component)
├── TopClientsTable.tsx           # Data table
├── TopSuppliersTable.tsx         # Data table
├── RecentTradesTable.tsx         # Data table
├── ReviewFlagsPanel.tsx          # Warning panel
└── ShopperSelector.tsx           # Dropdown (client component)

lib/
└── legacyData.ts          # Server-side data utilities (10 functions)

data/legacy-import/
├── legacy_suppliers.json  # 160 records
├── legacy_clients.json    # 157 records
├── legacy_trades.json     # 300 records
├── IMPORT_SUMMARY.md      # Detailed data summary
├── XATA_IMPORT_GUIDE.md   # Step-by-step import guide
└── README.md              # Quick reference
```

---

## Data Summary

| Metric | Value |
|--------|-------|
| Total Trades | 300 (Hope: 116, MC: 184) |
| Unique Suppliers | 160 |
| Unique Clients | 157 |
| Date Range | Dec 2024 - Oct 2025 |
| Trades with Dates | 280 (93%) |
| Clients Requiring Review | 2 |
| Data Integrity | 100% |

---

## Next Steps

1. ✅ Create legacy tables in Xata (web UI or CLI)
2. ✅ Import all JSON files
3. ✅ Regenerate Xata schema (`npx xata pull`)
4. ✅ Enable tables (`LEGACY_TABLES_EXIST = true`)
5. ✅ Remove @ts-expect-error comments
6. ✅ Test both dashboards
7. ✅ Verify RBAC
8. ✅ Deploy to production

---

## Support

For questions or issues:
- **Data Summary**: See [data/legacy-import/IMPORT_SUMMARY.md](data/legacy-import/IMPORT_SUMMARY.md)
- **Import Guide**: See [data/legacy-import/XATA_IMPORT_GUIDE.md](data/legacy-import/XATA_IMPORT_GUIDE.md)
- **Pipeline**: See [scripts/legacy-data-pipeline.py](scripts/legacy-data-pipeline.py)

---

**Generated:** 2025-12-03
**Status:** ✅ Build successful, ready for Xata setup
**Next Action:** Create legacy tables in Xata web UI
