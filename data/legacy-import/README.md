# Club 19 Sales OS - Legacy Data Import Package

## 📦 Package Contents

This directory contains the complete legacy data transformation output from Hope and MC's historical trade spreadsheets.

```
legacy-import/
├── README.md                          ← You are here
├── IMPORT_SUMMARY.md                  ← Comprehensive data summary
├── XATA_IMPORT_GUIDE.md              ← Step-by-step Xata import instructions
├── supplier_normalisation_map.json    ← Supplier name normalization rules
├── supplier_audit_table.json          ← Supplier audit with variants
├── legacy_suppliers.json              ← Xata: legacy_suppliers table
├── legacy_clients.json                ← Xata: legacy_clients table
├── legacy_trades.json                 ← Xata: legacy_trades table
└── suppliers_live_seed.json           ← Xata: suppliers table (live)
```

## 🎯 Quick Reference

| File | Records | Purpose |
|------|---------|---------|
| **legacy_suppliers.json** | 160 | Historical supplier data (isolated) |
| **legacy_clients.json** | 157 | Historical client data (isolated) |
| **legacy_trades.json** | 300 | Historical trade transactions |
| **suppliers_live_seed.json** | 160 | Seed live suppliers table with legacy data |

## 🚀 Import in 3 Steps

### 1. Review Documentation
```bash
cat IMPORT_SUMMARY.md     # Read the complete summary
cat XATA_IMPORT_GUIDE.md  # Read import instructions
```

### 2. Create Xata Tables
Follow the schema definitions in `XATA_IMPORT_GUIDE.md`

### 3. Import Data
```bash
xata import legacy_suppliers.json --table=legacy_suppliers --create
xata import legacy_clients.json --table=legacy_clients --create
xata import legacy_trades.json --table=legacy_trades --create
xata import suppliers_live_seed.json --table=suppliers --create
```

## ✅ Data Quality

- **300 trades** from 2 sources (Hope: 116, MC: 184)
- **160 suppliers** (all normalized, 0 requiring review)
- **157 clients** (2 requiring status review)
- **100% referential integrity** (all foreign keys resolve)
- **93% date coverage** (280/300 trades have dates)
- **0 rows dropped** (complete data preservation)

## ⚠️ Action Required

**2 clients require status review:**
1. `nourhan gomaa` - Mixed empty/"END CLIENT" status
2. `steph hill` - Mixed empty/"END CLIENT" status

See `IMPORT_SUMMARY.md` for details.

## 📊 Source Data

- **File 1:** `All HOPE_to Oct 2025..xlsx` (116 rows)
- **File 2:** `All MC_to Oct 2025.xlsx` (184 rows)
- **Date Range:** December 2024 - October 2025
- **Pipeline:** `scripts/legacy-data-pipeline.py`

## 🔧 Re-run Pipeline

```bash
cd /Users/olivertimmerman/Documents/Converso/Club-19-Sales-OS
python3 scripts/legacy-data-pipeline.py
```

Output will regenerate in this directory.

## 📞 Support

For questions or issues, see:
- Full data summary: `IMPORT_SUMMARY.md`
- Import instructions: `XATA_IMPORT_GUIDE.md`
- Pipeline script: `../scripts/legacy-data-pipeline.py`

---

**Generated:** 2025-12-03
**Pipeline Version:** legacy-import-v1
**Status:** ✅ Ready for Xata Import
