#!/bin/bash

###############################################################################
# Reset Legacy Tables Script
#
# Deletes existing legacy tables and recreates them with correct schema
###############################################################################

set -e

echo "🔄 Resetting Legacy Tables"
echo "══════════════════════════"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Delete tables (they have wrong schema from previous attempt)
echo "Deleting old tables..."
npx xata schema edit --db https://Oliver-Timmerman-s-workspace-d3730u.eu-central-1.xata.sh/db/Club19SalesOS --branch main 2>&1 <<SCHEMA_DELETE || true
delete table legacy_trades
delete table legacy_clients
delete table legacy_suppliers
save
SCHEMA_DELETE

echo -e "${GREEN}✓ Old tables deleted${NC}"
echo ""

# Now you need to create tables manually in Web UI
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PLEASE CREATE TABLES IN XATA WEB UI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Opening Xata Web UI..."
sleep 2
open "https://app.xata.io/workspaces/Oliver-Timmerman-s-workspace-d3730u/dbs/Club19SalesOS"

echo ""
echo "Please create the following tables:"
echo ""
echo "1️⃣  legacy_suppliers"
echo "   ├─ supplier_clean (String)"
echo "   ├─ raw_variants (Multiple)"
echo "   ├─ requires_review (Boolean)"
echo "   ├─ reason (Text)"
echo "   ├─ first_seen (Datetime)"
echo "   ├─ last_seen (Datetime)"
echo "   └─ trade_count (Integer)"
echo ""
echo "2️⃣  legacy_clients"
echo "   ├─ client_clean (String)"
echo "   ├─ raw_variants (Multiple)"
echo "   ├─ client_status (String)"
echo "   ├─ first_seen (Datetime)"
echo "   ├─ last_seen (Datetime)"
echo "   ├─ trade_count (Integer)"
echo "   └─ requires_review (Boolean)"
echo ""
echo "3️⃣  legacy_trades"
echo "   ├─ invoice_number (String)"
echo "   ├─ trade_date (Datetime)"
echo "   ├─ raw_client (String)"
echo "   ├─ raw_supplier (String)"
echo "   ├─ client_id (Link → legacy_clients)"
echo "   ├─ supplier_id (Link → legacy_suppliers)"
echo "   ├─ item (Text)"
echo "   ├─ brand (String)"
echo "   ├─ category (String)"
echo "   ├─ buy_price (Float)"
echo "   ├─ sell_price (Float)"
echo "   ├─ margin (Float)"
echo "   ├─ source (String)"
echo "   └─ raw_row (JSON)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Press ENTER when all 3 tables are created... "

echo ""
echo -e "${GREEN}✓ Tables ready!${NC}"
echo ""
echo "Now run the import:"
echo "  node scripts/import-to-xata.js"
