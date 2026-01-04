# Club 19 Sales OS - VAT Logic Documentation

**Generated:** 2026-01-04
**System:** Sales Atelier & Sales OS

---

## Table of Contents

1. [Overview](#overview)
2. [VAT Constants](#vat-constants)
3. [Price Storage & Data Flow](#price-storage--data-flow)
4. [VAT Calculations](#vat-calculations)
5. [Margin Calculations](#margin-calculations)
6. [Import VAT Logic](#import-vat-logic)
7. [Database Storage](#database-storage)
8. [Code Locations](#code-locations)

---

## Overview

The Club 19 Sales OS uses a **consistent VAT treatment** across all sales:
- UK VAT rate: **20%**
- VAT multiplier: **1.2**
- All prices in the UI are entered as **gross amounts (inc VAT)** for sell prices
- Buy prices are stored **excluding VAT** (net amounts)
- Margins are calculated on **ex-VAT amounts**

---

## VAT Constants

**File:** [`lib/economics.ts`](lib/economics.ts:13-14)

```typescript
export const VAT_RATE = 0.2;           // 20%
export const VAT_MULTIPLIER = 1.2;     // 1 + VAT_RATE
```

---

## Price Storage & Data Flow

### Sales Atelier (Trade Wizard)

**File:** [`components/trade/StepPricing.tsx`](components/trade/StepPricing.tsx)

#### User Input:
- **Buy Price (GBP):** Entered by user - line 55-91
- **Sell Price (GBP):** Entered by user - line 100-149

#### Storage in Database:
**File:** [`app/api/trade/create/route.ts`](app/api/trade/create/route.ts:228-260)

```typescript
// Line 228-234: Calculate totals
const totalBuyPrice = trade.items.reduce((sum, item) =>
  sum + (item.buyPriceGBP || item.buyPrice), 0
);
const totalSellPrice = trade.items.reduce((sum, item) =>
  sum + (item.sellPriceGBP || item.sellPrice), 0
);

// Line 257-260: Saved to database
buy_price: totalBuyPrice,              // STORED AS-IS (user enters net)
sale_amount_ex_vat: totalSellPrice,    // STORED AS-IS (user enters net)
sale_amount_inc_vat: totalSellPrice,   // ⚠️ TODO: Calculate actual VAT
currency: firstItem.sellCurrency || 'GBP',
```

**⚠️ IMPORTANT FINDING:**

**Line 259 shows a TODO comment:**
```typescript
sale_amount_inc_vat: totalSellPrice, // TODO: Calculate actual VAT if needed
```

**This means:**
- Currently, `sale_amount_ex_vat` and `sale_amount_inc_vat` are **stored with the same value**
- The system is **NOT currently calculating VAT** on sales created via Trade Wizard
- Buy and sell prices entered by users are assumed to be **net amounts (ex VAT)**

---

## VAT Calculations

**File:** [`lib/economics.ts`](lib/economics.ts:24-57)

### 1. Calculate Ex-VAT from Inc-VAT

```typescript
// Line 24-29
export function calculateExVat(amountIncVat: number): number {
  return amountIncVat / VAT_MULTIPLIER;
}

// Example: £120 inc VAT → £100 ex VAT
```

**Formula:** `amount_ex_vat = amount_inc_vat / 1.2`

### 2. Calculate VAT from Ex-VAT

```typescript
// Line 39-44
export function calculateVat(amountExVat: number): number {
  return amountExVat * VAT_RATE;
}

// Example: £100 ex VAT → £20 VAT
```

**Formula:** `vat_amount = amount_ex_vat * 0.2`

### 3. Calculate VAT from Inc-VAT

```typescript
// Line 54-57
export function calculateVatFromIncVat(amountIncVat: number): number {
  const exVat = calculateExVat(amountIncVat);
  return amountIncVat - exVat;
}

// Example: £120 inc VAT → £20 VAT
```

**Formula:** `vat_amount = amount_inc_vat - (amount_inc_vat / 1.2)`

---

## Margin Calculations

**File:** [`lib/economics.ts`](lib/economics.ts:69-103)

### 1. Gross Margin

```typescript
// Line 69-79
export function calculateGrossMargin(
  saleExVat: number,
  buyPrice: number,
  directCosts: number = 0
): number {
  return saleExVat - buyPrice - directCosts;
}
```

**Formula:**
```
Gross Margin = Sale Price (ex VAT) - Buy Price - Direct Costs
```

**Example:**
- Sale price (ex VAT): £1,000
- Buy price: £600
- Direct costs: £50
- **Gross Margin = £1,000 - £600 - £50 = £350**

### 2. Commissionable Margin

```typescript
// Line 93-103
export function calculateCommissionableMargin(
  grossMargin: number,
  cardFees: number,
  shippingCost: number = 0
): number {
  return grossMargin - cardFees - shippingCost;
}
```

**Formula:**
```
Commissionable Margin = Gross Margin - Card Fees - Shipping Cost
```

**Example:**
- Gross margin: £350
- Card fees: £30
- Shipping cost: £20
- **Commissionable Margin = £350 - £30 - £20 = £300**

### 3. Complete Sales Economics

**File:** [`lib/economics.ts`](lib/economics.ts:154-199)

```typescript
// Line 154-199
export function calculateSaleEconomics(params: SaleEconomicsParams): SaleEconomics {
  const {
    sale_amount_inc_vat,
    buy_price,
    card_fees = 0,
    shipping_cost = 0,
    direct_costs = 0,
  } = params;

  // Step 1: Calculate sale amount ex VAT
  const sale_amount_ex_vat = calculateExVat(sale_amount_inc_vat);

  // Step 2: Calculate VAT amount
  const vat_amount = sale_amount_inc_vat - sale_amount_ex_vat;

  // Step 3: Calculate gross margin
  const gross_margin = calculateGrossMargin(sale_amount_ex_vat, buy_price, direct_costs);

  // Step 4: Calculate commissionable margin
  const commissionable_margin = calculateCommissionableMargin(
    gross_margin,
    card_fees,
    shipping_cost
  );

  // Step 5: Calculate margin percentages
  const gross_margin_percent = calculateMarginPercent(gross_margin, sale_amount_ex_vat);
  const commissionable_margin_percent = calculateMarginPercent(
    commissionable_margin,
    sale_amount_ex_vat
  );

  return {
    sale_amount_inc_vat,
    sale_amount_ex_vat,
    vat_amount,
    buy_price,
    direct_costs,
    gross_margin,
    card_fees,
    shipping_cost,
    commissionable_margin,
    gross_margin_percent,
    commissionable_margin_percent,
  };
}
```

---

## Import VAT Logic

**File:** [`components/trade/StepLogisticsTax.tsx`](components/trade/StepLogisticsTax.tsx:118-149)

### When Import VAT Applies

Import VAT (20% of buy price) is added as a **non-reclaimable cost** when:

1. Item is **outside UK** (`itemLocation === "outside"`)
2. Client is **in UK** (`clientLocation === "uk"`)
3. Item **physically enters UK**:
   - Direct ship = No (item comes via Club 19), OR
   - Direct ship = Yes BUT landed delivery = No

```typescript
// Line 118-149
useEffect(() => {
  if (
    itemLocation === "outside" &&
    clientLocation === "uk" &&
    state.currentItem?.buyPrice
  ) {
    const itemEntersUK =
      directShip === "no" ||
      (directShip === "yes" && insuranceLanded === "no");

    if (itemEntersUK) {
      const importVAT = state.currentItem.buyPrice * 0.2;
      setImportVAT(importVAT);
    } else {
      setImportVAT(null);
    }
  } else {
    setImportVAT(null);
  }
}, [
  itemLocation,
  clientLocation,
  directShip,
  insuranceLanded,
  state.currentItem?.buyPrice,
  setImportVAT,
]);
```

### Import VAT Calculation

**Formula:**
```
Import VAT = Buy Price * 0.2
```

**Example:**
- Buy price: £500
- **Import VAT = £500 * 0.2 = £100**

### Impact on Commissionable Margin

**File:** [`components/trade/StepReview.tsx`](components/trade/StepReview.tsx:114-120)

```typescript
// Line 114-120
const commissionableMarginGBP = useMemo(() => {
  const importExportCost = state.estimatedImportExportGBP ?? 0;
  const importVATCost = state.importVAT ?? 0;
  return parseFloat(
    (grossMarginGBP - impliedCosts.total - importExportCost - importVATCost).toFixed(2)
  );
}, [grossMarginGBP, impliedCosts, state.estimatedImportExportGBP, state.importVAT]);
```

**Formula:**
```
Commissionable Margin = Gross Margin - Implied Costs - Import/Export Costs - Import VAT
```

---

## Database Storage

### Sales Table Fields

| Field | Description | VAT Treatment | Source |
|-------|-------------|---------------|--------|
| `buy_price` | Purchase price from supplier | **Stored as net (ex VAT)** | User input |
| `sale_amount_ex_vat` | Sale price excluding VAT | **Net amount** | User input (currently) |
| `sale_amount_inc_vat` | Sale price including VAT | **Gross amount** | ⚠️ Currently same as ex_vat |
| `gross_margin` | Sale ex VAT - Buy price - Direct costs | **Net calculation** | Calculated |
| `commissionable_margin` | Gross margin - Card fees - Shipping - Import VAT | **Net calculation** | Calculated |
| `card_fees` | Card processing fees | **Cost deduction** | Implied costs |
| `shipping_cost` | Shipping costs | **Cost deduction** | Implied costs |
| `direct_costs` | Other direct costs | **Cost deduction** | Implied costs |
| `currency` | Currency code (always GBP) | N/A | User input |

---

## VAT Margin Scheme Logic

**File:** [`components/trade/StepLogisticsTax.tsx`](components/trade/StepLogisticsTax.tsx:186-198)

### When Margin Scheme Applies

The system supports the **UK VAT Margin Scheme** for second-hand goods:

```typescript
// Line 186-198
const saleTypeLabel = useMemo(() => {
  if (!result) return "";

  if (result.accountCode === "425") {
    return "UK retail sale – 20% VAT";
  } else if (result.accountCode === "424") {
    return "Margin scheme resale";  // ← VAT Margin Scheme
  } else if (result.accountCode === "423") {
    return "Export sale – zero VAT to client";
  }
  return result.taxLabel;
}, [result]);
```

### Account Codes

| Account Code | Description | VAT Treatment |
|--------------|-------------|---------------|
| **425** | UK retail sale | Standard 20% VAT |
| **424** | Margin scheme resale | VAT on margin only |
| **423** | Export sale | Zero-rated (0% VAT) |

**When using Margin Scheme (424):**
- VAT is calculated on the **margin** (sell price - buy price) only
- Not on the full sale price
- Common for second-hand luxury goods

---

## Code Locations

### Core VAT Logic
- **[lib/economics.ts](lib/economics.ts)** - All VAT and margin calculation functions

### Sales Atelier (Trade Wizard)
- **[components/trade/StepPricing.tsx](components/trade/StepPricing.tsx)** - Buy/sell price input
- **[components/trade/StepLogisticsTax.tsx](components/trade/StepLogisticsTax.tsx)** - Tax scenario & import VAT
- **[components/trade/StepReview.tsx](components/trade/StepReview.tsx)** - Final margin calculations
- **[contexts/TradeContext.tsx](contexts/TradeContext.tsx)** - Wizard state management
- **[app/api/trade/create/route.ts](app/api/trade/create/route.ts)** - Save to database

### Database
- **Sales table** - Stores all sale records with VAT fields

---

## Summary of Formulas

### VAT Calculations
```
Ex VAT from Inc VAT:  amount_ex_vat = amount_inc_vat / 1.2
Inc VAT from Ex VAT:  amount_inc_vat = amount_ex_vat * 1.2
VAT Amount:           vat = amount_ex_vat * 0.2
```

### Margin Calculations
```
Gross Margin = Sale (ex VAT) - Buy Price - Direct Costs

Commissionable Margin = Gross Margin - Card Fees - Shipping - Import VAT
```

### Import VAT
```
Import VAT = Buy Price * 0.2  (when item enters UK from abroad)
```

---

## ⚠️ Known Issues / TODOs

### 1. VAT Not Calculated on Atelier Sales

**File:** [`app/api/trade/create/route.ts`](app/api/trade/create/route.ts:259)

```typescript
sale_amount_inc_vat: totalSellPrice, // TODO: Calculate actual VAT if needed
```

**Issue:**
- Currently `sale_amount_inc_vat` = `sale_amount_ex_vat` (both set to same value)
- No VAT calculation happening
- Users enter prices assuming they are **net amounts**

**Fix needed:**
```typescript
// Should be:
sale_amount_ex_vat: totalSellPrice,
sale_amount_inc_vat: totalSellPrice * 1.2,  // Add 20% VAT
```

### 2. Buy Price VAT Treatment Unclear

**Current behavior:**
- Buy prices entered by users are stored as-is
- No clear indication if they should be net or gross
- UI says "Price you're paying the supplier (always in GBP)" but doesn't specify inc/ex VAT

**Recommendation:**
- Clarify in UI whether buy price should be entered inc or ex VAT
- If suppliers charge inc VAT, store as `buy_price_inc_vat` and calculate net amount
- For margin calculations, always use **net buy price**

---

## Business Logic Notes

1. **All margins calculated on ex-VAT basis** - This is correct for UK VAT accounting
2. **Import VAT is non-reclaimable** - Treated as a direct cost, not reclaimable input VAT
3. **Margin scheme (424)** - Special treatment for second-hand goods
4. **Export sales (423)** - Zero-rated for VAT purposes
5. **Commissionable margin** - This is what shoppers earn commission on

---

**End of Documentation**
