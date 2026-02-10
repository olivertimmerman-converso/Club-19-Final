/**
 * Check Buyers table to understand the buyer data issue
 *
 * Run with: npx tsx scripts/check-buyers.ts
 */

// ORIGINAL XATA: import { getXataClient } from '../src/xata';
import { db } from '../db';
import { buyers, sales } from '../db/schema';
import { desc } from 'drizzle-orm';

// ORIGINAL XATA: const xata = getXataClient();

async function checkBuyers() {
  console.log('=== Checking Buyers Table ===\n');

  // Get all buyers
  // ORIGINAL XATA: const buyers = await xata.db.Buyers
  //   .select(['id', 'name', 'email', 'xero_contact_id'])
  //   .getAll();
  const allBuyers = await db
    .select({
      id: buyers.id,
      name: buyers.name,
      email: buyers.email,
      xeroContactId: buyers.xeroContactId,
    })
    .from(buyers);

  console.log(`Total buyers in database: ${allBuyers.length}\n`);

  if (allBuyers.length > 0) {
    console.log('Sample buyers:');
    allBuyers.slice(0, 10).forEach(buyer => {
      console.log(`- ${buyer.name || 'NO NAME'} (${buyer.email || 'no email'}) - Xero ID: ${buyer.xeroContactId || 'none'}`);
    });
  }

  console.log('\n=== Checking Sales with Buyers ===\n');

  // Get recent sales and check buyer linkage
  // ORIGINAL XATA: const sales = await xata.db.Sales
  //   .select(['id', 'xero_invoice_number', 'buyer.name', 'internal_notes'])
  //   .sort('sale_date', 'desc')
  //   .getMany({ pagination: { size: 20 } });
  const recentSales = await db.query.sales.findMany({
    columns: {
      id: true,
      xeroInvoiceNumber: true,
      internalNotes: true,
    },
    with: {
      buyer: {
        columns: {
          name: true,
        }
      }
    },
    orderBy: [desc(sales.saleDate)],
    limit: 20,
  });

  console.log(`Total recent sales: ${recentSales.length}\n`);

  const withBuyer = recentSales.filter(s => s.buyer?.name);
  const withoutBuyer = recentSales.filter(s => !s.buyer?.name);

  console.log(`Sales WITH buyer linked: ${withBuyer.length}`);
  console.log(`Sales WITHOUT buyer linked: ${withoutBuyer.length}\n`);

  if (withBuyer.length > 0) {
    console.log('Sales WITH buyer (sample):');
    withBuyer.slice(0, 3).forEach(s => {
      console.log(`- Invoice ${s.xeroInvoiceNumber}: Buyer = ${s.buyer?.name}`);
    });
  }

  if (withoutBuyer.length > 0) {
    console.log('\nSales WITHOUT buyer (checking internal_notes):');
    withoutBuyer.slice(0, 5).forEach(s => {
      const clientMatch = s.internalNotes?.match(/Client:\s*([^.]+)/);
      const clientName = clientMatch ? clientMatch[1].trim() : 'Unknown';
      console.log(`- Invoice ${s.xeroInvoiceNumber}: Client in notes = "${clientName}"`);
    });
  }

  console.log('\n=== Analysis Complete ===');
  process.exit(0);
}

checkBuyers().catch(err => {
  console.error(err);
  process.exit(1);
});
