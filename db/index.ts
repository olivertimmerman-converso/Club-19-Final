/**
 * Club 19 Sales OS - Drizzle Database Connection
 *
 * This file sets up the Drizzle ORM connection to Xata's PostgreSQL database.
 * Uses the postgres.js driver for optimal performance.
 *
 * Environment variable: XATA_POSTGRES_URL
 *
 * Usage:
 *   import { db } from '@/db';
 *   const shoppers = await db.select().from(schema.shoppers);
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Connection string from environment
const connectionString = process.env.XATA_POSTGRES_URL;

if (!connectionString) {
  throw new Error(
    "XATA_POSTGRES_URL environment variable is required for Drizzle ORM"
  );
}

// Create postgres client
// Note: For serverless environments, use connection pooling options
const client = postgres(connectionString, {
  // Recommended settings for serverless
  max: 10, // Maximum connections in pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
});

// Create Drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for convenience
export { schema };

// Export types
export type DrizzleDB = typeof db;
