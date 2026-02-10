/**
 * Test script to diagnose Clients page query error
 *
 * Simulates exactly what the Clients page does
 *
 * Run with: npx tsx scripts/test-clients-query.ts
 */

import { config } from 'dotenv';
// ORIGINAL XATA: import { XataClient } from '../src/xata';
import { db } from '../db';
import { shoppers, sales, buyers } from '../db/schema';
import { eq, asc, isNull, inArray } from 'drizzle-orm';

// Load .env.local
config({ path: '.env.local' });

// ORIGINAL XATA:
// const xata = new XataClient({
//   apiKey: process.env.XATA_API_KEY,
//   branch: process.env.XATA_BRANCH || 'main',
// });

async function main() {
  console.log('\n=== SIMULATING CLIENTS PAGE ===\n');

  try {
    // Step 1: Fetch shoppers (for filter dropdown)
    console.log('Step 1: Fetching active shoppers...');
    // ORIGINAL XATA: const allShoppers = await xata.db.Shoppers
    //   .select(['id', 'name'])
    //   .filter({ active: true })
    //   .sort('name', 'asc')
    //   .getAll();
    const allShoppers = await db
      .select({ id: shoppers.id, name: shoppers.name })
      .from(shoppers)
      .where(eq(shoppers.active, true))
      .orderBy(asc(shoppers.name));
    console.log(`  OK - Found ${allShoppers.length} active shoppers`);

    // Step 2: Fetch sales
    console.log('\nStep 2: Fetching sales...');
    // ORIGINAL XATA: const sales = await xata.db.Sales
    //   .select([...])
    //   .filter({ deleted_at: { $is: null } })
    //   .getMany({ pagination: { size: 1000 } });
    const allSales = await db.query.sales.findMany({
      columns: {
        id: true,
        saleAmountIncVat: true,
        grossMargin: true,
        saleDate: true,
        source: true,
        invoiceStatus: true,
      },
      with: {
        buyer: { columns: { id: true } },
        shopper: { columns: { name: true } },
      },
      where: isNull(sales.deletedAt),
      limit: 1000,
    });
    console.log(`  OK - Found ${allSales.length} sales`);

    // Step 3: Get unique buyer IDs
    console.log('\nStep 3: Getting unique buyer IDs...');
    const buyerIds = allSales.map(sale => sale.buyer?.id).filter(Boolean) as string[];
    const uniqueBuyerIds = [...new Set(buyerIds)];
    console.log(`  OK - Found ${uniqueBuyerIds.length} unique buyer IDs`);

    if (uniqueBuyerIds.length === 0) {
      console.log('\n⚠️ No buyer IDs found');
      process.exit(0);
      return;
    }

    // Step 4: Fetch buyers WITH owner link (exactly as in clients page)
    console.log('\nStep 4: Fetching buyers with owner link...');
    console.log("  Query: db.query.buyers.findMany with owner relation");

    // ORIGINAL XATA: const buyers = await xata.db.Buyers
    //   .select(['*', 'owner.id', 'owner.name'])
    //   .filter({ id: { $any: uniqueBuyerIds } })
    //   .getMany({ pagination: { size: 100 } });
    const allBuyers = await db.query.buyers.findMany({
      with: {
        owner: {
          columns: { id: true, name: true }
        }
      },
      where: inArray(buyers.id, uniqueBuyerIds),
      limit: 100,
    });
    console.log(`  OK - Found ${allBuyers.length} buyers`);

    // Step 5: Check owner data resolution
    console.log('\nStep 5: Checking owner data...');
    let withOwner = 0;
    let withoutOwner = 0;

    allBuyers.forEach(buyer => {
      if (buyer.owner?.id) {
        withOwner++;
        console.log(`    - ${buyer.name}: owner=${buyer.owner.name || buyer.owner.id}`);
      } else {
        withoutOwner++;
      }
    });

    console.log(`\n  With owner: ${withOwner}`);
    console.log(`  Without owner: ${withoutOwner}`);

    // Step 6: Test building ClientWithStats (simplified)
    console.log('\nStep 6: Building client stats...');
    const clientsWithStats = allBuyers.map(buyer => {
      const buyerSales = allSales.filter(sale => sale.buyer?.id === buyer.id);
      return {
        id: buyer.id,
        name: buyer.name || 'Unnamed Client',
        ownerId: buyer.owner?.id || null,
        ownerName: buyer.owner?.name || null,
        salesCount: buyerSales.length,
      };
    });
    console.log(`  OK - Built stats for ${clientsWithStats.length} clients`);

    // Show first few
    clientsWithStats.slice(0, 3).forEach(c => {
      console.log(`    - ${c.name}: owner=${c.ownerName || 'Unassigned'}, sales=${c.salesCount}`);
    });

    console.log('\n=== ALL TESTS PASSED ===');
    console.log('The queries work correctly locally.');
    console.log('The issue may be environment-specific (Vercel) or related to auth context.');

  } catch (err: any) {
    console.error('\n✗ ERROR:', err.message);
    console.error('Full error:', err);
    if (err.stack) {
      console.error('Stack:', err.stack);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
