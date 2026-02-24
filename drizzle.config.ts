import dotenv from "dotenv";
import path from "path";

// Load .env.local so drizzle-kit can access XATA_POSTGRES_URL
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.XATA_POSTGRES_URL!,
  },
});
