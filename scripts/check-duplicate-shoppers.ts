/**
 * Check for duplicate shopper entries in the database
 * This script identifies if the same shopper name has multiple IDs
 *
 * Run with: npx tsx scripts/check-duplicate-shoppers.ts
 */

// ORIGINAL XATA: import { getXataClient } from '../src/xata';
import { db } from '../db';
import { shoppers, sales } from '../db/schema';

// ORIGINAL XATA: const xata = getXataClient();

async function checkDuplicateShoppers() {
  console.log('Fetching all shoppers...\n');

  // ORIGINAL XATA: const shoppers = await xata.db.Shoppers
  //   .select(['id', 'name', 'email'])
  //   .getAll();
  const allShoppers = await db
    .select({
      id: shoppers.id,
      name: shoppers.name,
      email: shoppers.email,
    })
    .from(shoppers);

  console.log(`Total shoppers in database: ${allShoppers.length}\n`);

  // Group by name to find duplicates
  const shoppersByName = new Map<string, Array<{ id: string; email: string | null }>>();

  allShoppers.forEach(shopper => {
    const name = shopper.name || 'Unknown';
    if (!shoppersByName.has(name)) {
      shoppersByName.set(name, []);
    }
    shoppersByName.get(name)!.push({
      id: shopper.id,
      email: shopper.email
    });
  });

  // Find names with multiple IDs
  const duplicates: Array<{ name: string; records: Array<{ id: string; email: string | null }> }> = [];
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

  // ORIGINAL XATA: const sales = await xata.db.Sales
  //   .select(['id', 'sale_date', 'shopper.id', 'shopper.name'])
  //   .getAll();
  const allSales = await db.query.sales.findMany({
    columns: {
      id: true,
      saleDate: true,
    },
    with: {
      shopper: {
        columns: {
          id: true,
          name: true,
        }
      }
    }
  });

  const salesByShopperId = new Map<string, { name: string; salesCount: number }>();
  allSales.forEach(sale => {
    if (sale.shopper?.id) {
      const shopperId = sale.shopper.id;
      const shopperName = sale.shopper.name || 'Unknown';

      if (!salesByShopperId.has(shopperId)) {
        salesByShopperId.set(shopperId, {
          name: shopperName,
          salesCount: 0
        });
      }
      salesByShopperId.get(shopperId)!.salesCount++;
    }
  });

  console.log(`\nShoppers with sales:`);
  const shoppersWithSales = Array.from(salesByShopperId.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.salesCount - a.salesCount);

  shoppersWithSales.forEach(shopper => {
    console.log(`  ${shopper.name}: ${shopper.salesCount} sales (ID: ${shopper.id})`);
  });

  process.exit(0);
}

checkDuplicateShoppers().catch(err => {
  console.error(err);
  process.exit(1);
});
