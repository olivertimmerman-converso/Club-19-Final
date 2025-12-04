/**
 * Check if legacy tables have data in Xata
 */

const { XataClient } = require('../src/xata');

async function checkTables() {
  const xata = new XataClient();

  console.log('🔍 Checking legacy tables in Xata...\n');

  try {
    // Check legacy_suppliers
    const suppliers = await xata.db.legacy_suppliers.getAll();
    console.log(`✓ legacy_suppliers: ${suppliers.length} records`);

    // Check legacy_clients
    const clients = await xata.db.legacy_clients.getAll();
    console.log(`✓ legacy_clients: ${clients.length} records`);

    // Check legacy_trades
    const trades = await xata.db.legacy_trades.getAll();
    console.log(`✓ legacy_trades: ${trades.length} records`);

    console.log('\n📊 Summary:');
    console.log(`Total records: ${suppliers.length + clients.length + trades.length}`);

    if (trades.length === 0) {
      console.log('\n⚠️  WARNING: No data found in legacy tables!');
      console.log('Run: node scripts/create-legacy-tables.js');
      console.log('Then: node scripts/import-to-xata.js');
    } else {
      console.log('\n✅ Legacy tables populated!');

      // Show sample trade
      if (trades.length > 0) {
        console.log('\nSample trade:');
        console.log(JSON.stringify(trades[0], null, 2));
      }
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkTables();
