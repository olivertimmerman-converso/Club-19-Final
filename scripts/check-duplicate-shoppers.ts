/**
 * Check for duplicate shopper entries in the database
 * This script identifies if the same shopper name has multiple IDs
 */

import { getXataClient } from '../src/xata';

const xata = getXataClient();

async function checkDuplicateShoppers() {
  console.log('Fetching all shoppers...\n');

  const shoppers = await xata.db.Shoppers
    .select(['id', 'name', 'email'])
    .getAll();

  console.log(`Total shoppers in database: ${shoppers.length}\n`);

  // Group by name to find duplicates
  const shoppersByName = new Map();

  shoppers.forEach(shopper => {
    const name = shopper.name || 'Unknown';
    if (!shoppersByName.has(name)) {
      shoppersByName.set(name, []);
    }
    shoppersByName.get(name).push({
      id: shopper.id,
      email: shopper.email
    });
  });

  // Find names with multiple IDs
  const duplicates = [];
  shoppersByName.forEach((records, name) => {
    if (records.length > 1) {
      duplicates.push({ name, records });
    }
  });

  if (duplicates.length === 0) {
    console.log('✓ No duplicate shopper names found - each name has unique ID');
  } else {
    console.log(`⚠️  Found ${duplicates.length} shopper name(s) with multiple IDs:\n`);
    duplicates.forEach(({ name, records }) => {
      console.log(`Shopper: "${name}"`);
      console.log(`  Has ${records.length} different IDs:`);
      records.forEach((record, idx) => {
        console.log(`  ${idx + 1}. ID: ${record.id}`);
        if (record.email) console.log(`     Email: ${record.email}`);
      });
      console.log();
    });
  }

  // Also check for sales data
  console.log('\nChecking sales with shopper assignments...');
  const sales = await xata.db.Sales
    .select(['id', 'sale_date', 'shopper.id', 'shopper.name'])
    .getAll();

  const salesByShopperId = new Map();
  sales.forEach(sale => {
    if (sale.shopper?.id) {
      const shopperId = sale.shopper.id;
      const shopperName = sale.shopper.name || 'Unknown';

      if (!salesByShopperId.has(shopperId)) {
        salesByShopperId.set(shopperId, {
          name: shopperName,
          salesCount: 0
        });
      }
      salesByShopperId.get(shopperId).salesCount++;
    }
  });

  console.log(`\nShoppers with sales:`);
  const shoppersWithSales = Array.from(salesByShopperId.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.salesCount - a.salesCount);

  shoppersWithSales.forEach(shopper => {
    console.log(`  ${shopper.name}: ${shopper.salesCount} sales (ID: ${shopper.id})`);
  });
}

checkDuplicateShoppers().catch(console.error);
