/**
 * Add source column to line_items table and fix INV-3341
 * Usage: npx tsx scripts/add-source-column.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.vercel.pulled" });
dotenv.config({ path: ".env.local" });

async function main() {
  const { db } = await import("@/db");
  const { sql } = await import("drizzle-orm");

  // 1. Add source column if it doesn't exist
  console.log("Adding source column...");
  await db.execute(sql`ALTER TABLE line_items ADD COLUMN IF NOT EXISTS source text DEFAULT 'atelier'`);
  console.log("Column added.");

  // 2. Fix INV-3341's 2 backfilled line items
  console.log("Fixing INV-3341 line items...");
  const result = await db.execute(sql`
    UPDATE line_items SET source = 'xero_import'
    WHERE sale_id IN (
      SELECT id FROM sales WHERE xero_invoice_number = 'INV-3341'
    )
  `);
  console.log("INV-3341 fixed.", result);

  // 3. Count
  const totals = await db.execute(sql`
    SELECT source, count(*) as count FROM line_items GROUP BY source
  `);
  console.log("Line items by source:", totals);

  process.exit(0);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
