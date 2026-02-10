/**
 * Get unique branding themes from the database
 *
 * Run with: npx tsx scripts/get-branding-themes.ts
 */

// ORIGINAL XATA: import { getXataClient } from '../src/xata';
import { db } from '../db';
import { sales } from '../db/schema';
import { isNotNull } from 'drizzle-orm';

async function main() {
  // ORIGINAL XATA: const xata = getXataClient();

  // ORIGINAL XATA: const sales = await xata.db.Sales
  //   .select(['branding_theme'])
  //   .filter({ branding_theme: { $isNot: null } })
  //   .getMany({ pagination: { size: 100 } });
  const salesWithThemes = await db
    .select({ brandingTheme: sales.brandingTheme })
    .from(sales)
    .where(isNotNull(sales.brandingTheme))
    .limit(100);

  const themes = new Set(salesWithThemes.map(s => s.brandingTheme).filter(Boolean));

  console.log('\nUnique branding themes in database:');
  console.log('====================================');
  themes.forEach(t => console.log(`  - "${t}"`));
  console.log(`\nTotal: ${themes.size} unique themes`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
