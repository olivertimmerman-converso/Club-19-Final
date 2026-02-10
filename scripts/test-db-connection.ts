/**
 * Test script to verify Drizzle database connection
 *
 * Usage: npm run db:test
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";

// Load .env.local
config({ path: ".env.local" });

const connectionString = process.env.XATA_POSTGRES_URL;

if (!connectionString) {
  console.error("❌ XATA_POSTGRES_URL environment variable is not set");
  process.exit(1);
}

console.log("🔌 Connecting to Xata PostgreSQL...");
console.log(`   Host: ${connectionString.split("@")[1]?.split("/")[0] || "unknown"}`);

async function main() {
  const client = postgres(connectionString!, {
    max: 1,
    connect_timeout: 10,
  });

  const db = drizzle(client);

  try {
    // Test basic connectivity with SELECT NOW()
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    const timestamp = result[0]?.current_time;

    console.log("\n✅ Connection successful!");
    console.log(`   Server time: ${timestamp}`);

    // Test that we can query tables
    const tableCount = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    console.log(`   Tables in database: ${tableCount[0]?.count}`);

    // List some tables
    const tables = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
      LIMIT 10
    `);

    console.log("\n📋 Sample tables:");
    tables.forEach((t: { table_name: string }) => {
      console.log(`   - ${t.table_name}`);
    });

    console.log("\n🎉 Drizzle ORM is ready to use!");
  } catch (error) {
    console.error("\n❌ Connection failed!");
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
