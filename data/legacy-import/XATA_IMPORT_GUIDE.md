# Xata Import Guide - Legacy Data

## Quick Start

```bash
cd /Users/olivertimmerman/Documents/Converso/Club-19-Sales-OS/data/legacy-import
```

## Table Schemas

### 1. Create `legacy_suppliers` table

```bash
xata schema edit legacy_suppliers
```

Schema:
```json
{
  "columns": [
    {"name": "supplier_clean", "type": "string"},
    {"name": "raw_variants", "type": "multiple"},
    {"name": "requires_review", "type": "bool"},
    {"name": "reason", "type": "text"},
    {"name": "first_seen", "type": "datetime"},
    {"name": "last_seen", "type": "datetime"},
    {"name": "trade_count", "type": "int"}
  ]
}
```

### 2. Create `legacy_clients` table

```bash
xata schema edit legacy_clients
```

Schema:
```json
{
  "columns": [
    {"name": "client_clean", "type": "string"},
    {"name": "raw_variants", "type": "multiple"},
    {"name": "client_status", "type": "string"},
    {"name": "first_seen", "type": "datetime"},
    {"name": "last_seen", "type": "datetime"},
    {"name": "trade_count", "type": "int"},
    {"name": "requires_review", "type": "bool"}
  ]
}
```

### 3. Create `legacy_trades` table

```bash
xata schema edit legacy_trades
```

Schema:
```json
{
  "columns": [
    {"name": "invoice_number", "type": "string"},
    {"name": "trade_date", "type": "datetime"},
    {"name": "raw_client", "type": "string"},
    {"name": "raw_supplier", "type": "string"},
    {"name": "client_id", "type": "link", "link": {"table": "legacy_clients"}},
    {"name": "supplier_id", "type": "link", "link": {"table": "legacy_suppliers"}},
    {"name": "item", "type": "text"},
    {"name": "brand", "type": "string"},
    {"name": "category", "type": "string"},
    {"name": "buy_price", "type": "float"},
    {"name": "sell_price", "type": "float"},
    {"name": "margin", "type": "float"},
    {"name": "source", "type": "string"},
    {"name": "raw_row", "type": "json"}
  ]
}
```

### 4. Update `suppliers` table (if needed)

```bash
xata schema edit suppliers
```

Ensure these columns exist:
```json
{
  "columns": [
    {"name": "supplier_name", "type": "string"},
    {"name": "raw_variants", "type": "multiple"},
    {"name": "requires_review", "type": "bool"},
    {"name": "is_legacy", "type": "bool"},
    {"name": "created_from", "type": "string"},
    {"name": "default_currency", "type": "string"},
    {"name": "supplier_type", "type": "string"},
    {"name": "notes", "type": "text"},
    {"name": "first_seen", "type": "datetime"},
    {"name": "last_seen", "type": "datetime"},
    {"name": "trade_count", "type": "int"}
  ]
}
```

## Import Commands

### Import Legacy Data

```bash
# Import suppliers (160 records)
xata import legacy_suppliers.json --table=legacy_suppliers --create

# Import clients (157 records)
xata import legacy_clients.json --table=legacy_clients --create

# Import trades (300 records)
xata import legacy_trades.json --table=legacy_trades --create
```

### Seed Live Suppliers Table

```bash
# Seed suppliers table with legacy data (160 records)
xata import suppliers_live_seed.json --table=suppliers --create
```

## Verification Queries

```bash
# Check record counts
xata query --table=legacy_suppliers --filter='{}' --columns='*' | jq length
xata query --table=legacy_clients --filter='{}' --columns='*' | jq length
xata query --table=legacy_trades --filter='{}' --columns='*' | jq length

# Check legacy suppliers in live table
xata query --table=suppliers --filter='{"is_legacy": true}' --columns='*' | jq length

# Find items requiring review
xata query --table=legacy_clients --filter='{"requires_review": true}' --columns='*'
```

## Troubleshooting

### Issue: Date format errors
**Solution:** Dates are in ISO 8601 format (`YYYY-MM-DD`). If Xata expects different format, update pipeline script.

### Issue: Link fields not resolving
**Solution:** Ensure `legacy_suppliers` and `legacy_clients` are imported BEFORE `legacy_trades`.

### Issue: Duplicate IDs
**Solution:** UUIDs are deterministic. Re-running pipeline produces same IDs. Clear existing data before reimport.

### Issue: JSON parse errors
**Solution:** Validate JSON files:
```bash
jq empty legacy_suppliers.json && echo "Valid"
jq empty legacy_clients.json && echo "Valid"
jq empty legacy_trades.json && echo "Valid"
```
