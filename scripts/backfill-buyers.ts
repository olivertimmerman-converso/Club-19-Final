/**
 * Backfill missing buyer links for existing sales
 * Extracts client names from internal_notes and creates/links buyers
 *
 * Run with: npx tsx scripts/backfill-buyers.ts
 */

// ORIGINAL XATA: import { getXataClient } from '../src/xata';
import { db } from '../db';
import { buyers, sales } from '../db/schema';
import { eq, isNull, ilike } from 'drizzle-orm';

// ORIGINAL XATA: const xata = getXataClient();

async function backfillBuyers() {
  console.log('=== Backfilling Missing Buyers ===\n');

  // Get all sales without buyers
  // ORIGINAL XATA: const salesWithoutBuyers = await xata.db.Sales
  //   .filter({ buyer: null })
  //   .select(['id', 'xero_invoice_number', 'internal_notes'])
  //   .getAll();
  const salesWithoutBuyers = await db
    .select({
      id: sales.id,
      xeroInvoiceNumber: sales.xeroInvoiceNumber,
      internalNotes: sales.internalNotes,
    })
    .from(sales)
    .where(isNull(sales.buyerId));

  console.log(`Found ${salesWithoutBuyers.length} sales without buyers\n`);

  let created = 0;
  let linked = 0;
  let skipped = 0;

  for (const sale of salesWithoutBuyers) {
    // Extract client name from internal_notes
    const clientMatch = sale.internalNotes?.match(/Client:\s*([^.]+)/);
    if (!clientMatch) {
      console.log(`⚠ Skipping ${sale.xeroInvoiceNumber}: No client name in notes`);
      skipped++;
      continue;
    }

    const clientName = clientMatch[1].trim();
    console.log(`Processing ${sale.xeroInvoiceNumber}: Client = "${clientName}"`);

    // Try to find existing buyer
    // ORIGINAL XATA: let buyer = await xata.db.Buyers.filter({
    //   name: { $iContains: clientName }
    // }).getFirst();
    const existingBuyers = await db
      .select()
      .from(buyers)
      .where(ilike(buyers.name, `%${clientName}%`))
      .limit(1);
    let buyer = existingBuyers[0] || null;

    if (!buyer) {
      // Create new buyer
      console.log(`  → Creating new buyer: ${clientName}`);
      // ORIGINAL XATA: buyer = await xata.db.Buyers.create({ name: clientName });
      const newBuyers = await db
        .insert(buyers)
        .values({ name: clientName })
        .returning();
      buyer = newBuyers[0];
      created++;
    }

    // Link buyer to sale
    // ORIGINAL XATA: await xata.db.Sales.update(sale.id, { buyer: buyer.id });
    await db
      .update(sales)
      .set({ buyerId: buyer.id })
      .where(eq(sales.id, sale.id));
    console.log(`  ✓ Linked buyer ${buyer.name} to sale ${sale.xeroInvoiceNumber}`);
    linked++;
  }

  console.log('\n=== Backfill Complete ===');
  console.log(`Buyers created: ${created}`);
  console.log(`Sales linked: ${linked}`);
  console.log(`Sales skipped: ${skipped}`);

  process.exit(0);
}

backfillBuyers().catch(err => {
  console.error(err);
  process.exit(1);
});
