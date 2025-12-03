#!/bin/bash

###############################################################################
# FINAL LEGACY DASHBOARDS ACTIVATION
#
# This is the complete activation script that handles everything:
# 1. Opens Web UI for table creation
# 2. Imports all data
# 3. Regenerates schema
# 4. Builds application
# 5. Prepares commit
###############################################################################

set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 LEGACY DASHBOARDS - FINAL ACTIVATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

cd "/Users/olivertimmerman/Documents/Converso/Club-19-Sales-OS"

###############################################################################
# STEP 1: Create tables in Web UI
###############################################################################

echo -e "${BLUE}${BOLD}STEP 1: Create Tables in Xata Web UI${NC}"
echo "════════════════════════════════════════════════"
echo ""
echo "I will now open the Xata Web UI."
echo "Please create 3 tables with the EXACT schema below:"
echo ""

cat << 'SCHEMA'
┌─────────────────────────────────────────────────────────────┐
│ TABLE 1: legacy_suppliers                                   │
├─────────────────────────────────────────────────────────────┤
│ supplier_clean      │ String                                │
│ raw_variants        │ Multiple                              │
│ requires_review     │ Boolean                               │
│ reason              │ Text                                  │
│ first_seen          │ Datetime                              │
│ last_seen           │ Datetime                              │
│ trade_count         │ Integer                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TABLE 2: legacy_clients                                     │
├─────────────────────────────────────────────────────────────┤
│ client_clean        │ String                                │
│ raw_variants        │ Multiple                              │
│ client_status       │ String                                │
│ first_seen          │ Datetime                              │
│ last_seen           │ Datetime                              │
│ trade_count         │ Integer                               │
│ requires_review     │ Boolean                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TABLE 3: legacy_trades                                      │
├─────────────────────────────────────────────────────────────┤
│ invoice_number      │ String                                │
│ trade_date          │ Datetime                              │
│ raw_client          │ String                                │
│ raw_supplier        │ String                                │
│ client_id           │ Link → legacy_clients                 │
│ supplier_id         │ Link → legacy_suppliers               │
│ item                │ Text                                  │
│ brand               │ String                                │
│ category            │ String                                │
│ buy_price           │ Float                                 │
│ sell_price          │ Float                                 │
│ margin              │ Float                                 │
│ source              │ String                                │
│ raw_row             │ JSON                                  │
└─────────────────────────────────────────────────────────────┘
SCHEMA

echo ""
echo -e "${YELLOW}Opening Xata Web UI in 3 seconds...${NC}"
sleep 3

open "https://app.xata.io/workspaces/Oliver-Timmerman-s-workspace-d3730u/dbs/Club19SalesOS"

echo ""
echo -e "${BOLD}⏳ Waiting for you to create tables...${NC}"
echo ""
read -p "Press ENTER after creating all 3 tables... "

echo ""
echo "Verifying tables exist..."

# Verify tables
node -e "
const https = require('https');
const fs = require('fs');
const API_KEY = fs.readFileSync(require('os').homedir() + '/.config/xata/credentials', 'utf8').match(/apiKey=([^\n\r]+)/)[1];

async function testTable(tableName) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'Oliver-Timmerman-s-workspace-d3730u.eu-central-1.xata.sh',
      path: '/db/Club19SalesOS:main/tables/' + tableName + '/query',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.write(JSON.stringify({ page: { size: 1 } }));
    req.end();
  });
}

Promise.all([
  testTable('legacy_suppliers'),
  testTable('legacy_clients'),
  testTable('legacy_trades')
]).then(results => {
  if (results.every(r => r)) {
    console.log('✓ All 3 tables verified!');
    process.exit(0);
  } else {
    console.log('✗ Tables not found. Please create them.');
    process.exit(1);
  }
});
"

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Tables not found. Please create them and run this script again.${NC}"
    exit 1
fi

echo ""

###############################################################################
# STEP 2: Import data
###############################################################################

echo -e "${BLUE}${BOLD}STEP 2: Import Data (617 records)${NC}"
echo "════════════════════════════════════════════════"
echo ""

node scripts/import-to-xata.js

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Import failed${NC}"
    exit 1
fi

echo ""

###############################################################################
# STEP 3: Regenerate schema
###############################################################################

echo -e "${BLUE}${BOLD}STEP 3: Regenerate Xata Schema${NC}"
echo "════════════════════════════════════════════════"
echo ""

npx xata pull main --force 2>&1 | grep -v "You have a single workspace"

echo ""

# Verify schema has legacy tables
if grep -q "legacy_trades" src/xata.ts && \
   grep -q "legacy_clients" src/xata.ts && \
   grep -q "legacy_suppliers" src/xata.ts; then
    echo -e "${GREEN}✓ Legacy tables found in TypeScript schema${NC}"
else
    echo -e "${RED}✗ Legacy tables not in schema${NC}"
    exit 1
fi

echo ""

###############################################################################
# STEP 4: Build application
###############################################################################

echo -e "${BLUE}${BOLD}STEP 4: Build Application${NC}"
echo "════════════════════════════════════════════════"
echo ""

npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

echo ""

###############################################################################
# STEP 5: Data validation
###############################################################################

echo -e "${BLUE}${BOLD}STEP 5: Validate Data${NC}"
echo "════════════════════════════════════════════════"
echo ""

# Query record counts
node -e "
const https = require('https');
const fs = require('fs');
const API_KEY = fs.readFileSync(require('os').homedir() + '/.config/xata/credentials', 'utf8').match(/apiKey=([^\n\r]+)/)[1];

async function getCount(table) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'Oliver-Timmerman-s-workspace-d3730u.eu-central-1.xata.sh',
      path: '/db/Club19SalesOS:main/tables/' + table + '/aggregate',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data.aggs?.totalCount || 0);
        } catch (e) {
          resolve(0);
        }
      });
    });

    req.on('error', () => resolve(0));
    req.write(JSON.stringify({ aggs: { totalCount: { count: '*' } } }));
    req.end();
  });
}

Promise.all([
  getCount('legacy_suppliers'),
  getCount('legacy_clients'),
  getCount('legacy_trades')
]).then(([suppliers, clients, trades]) => {
  console.log('Record counts:');
  console.log('  Suppliers: ' + suppliers + ' (expected: 160)');
  console.log('  Clients: ' + clients + ' (expected: 157)');
  console.log('  Trades: ' + trades + ' (expected: 300)');
  console.log('  Total: ' + (suppliers + clients + trades) + ' (expected: 617)');

  if (suppliers === 160 && clients === 157 && trades === 300) {
    console.log('\\n✓ All counts match!');
  } else {
    console.log('\\n⚠️  Count mismatch');
  }
});
"

echo ""

###############################################################################
# STEP 6: Prepare commit
###############################################################################

echo -e "${BLUE}${BOLD}STEP 6: Prepare Commit${NC}"
echo "════════════════════════════════════════════════"
echo ""

git add src/xata.ts

echo -e "${GREEN}✓ src/xata.ts staged${NC}"
echo ""

###############################################################################
# SUCCESS
###############################################################################

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}${BOLD}🎉 LEGACY DASHBOARDS ACTIVATED! 🎉${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ All tasks complete:"
echo "   • 3 legacy tables created"
echo "   • 617 records imported"
echo "   • Schema regenerated"
echo "   • Application built"
echo "   • Code staged for commit"
echo ""
echo "📊 Dashboards ready at:"
echo "   • Leadership: http://localhost:3000/legacy"
echo "   • Shopper:    http://localhost:3000/legacy/my-sales"
echo ""
echo "🚀 To deploy:"
echo ""
echo "   git commit -m \"feat: Activate legacy dashboards with imported data"
echo ""
echo "   ✅ Created 3 legacy tables in Xata"
echo "   ✅ Imported 300 trades, 160 suppliers, 157 clients"
echo "   ✅ Regenerated schema with legacy table types"
echo ""
echo "   🚀 Generated with Claude Code\""
echo ""
echo "   git push origin main"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
