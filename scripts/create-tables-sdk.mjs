#!/usr/bin/env node

/**
 * Create Xata tables using the @xata.io/client SDK
 * This bypasses CLI interactivity by using the SDK directly
 */

import { XataApiClient } from '@xata.io/client';
import { readFileSync } from 'fs';
import { homedir } from 'os';

// Configuration
const WORKSPACE = 'Oliver-Timmerman-s-workspace-d3730u';
const REGION = 'eu-central-1';
const DATABASE = 'Club19SalesOS';
const BRANCH = 'main';

// Get API key
let API_KEY = process.env.XATA_API_KEY;

if (!API_KEY) {
  try {
    const credPath = `${homedir()}/.config/xata/credentials`;
    const credContent = readFileSync(credPath, 'utf8');
    const match = credContent.match(/apiKey=([^\n\r]+)/);
    if (match) {
      API_KEY = match[1];
    }
  } catch (err) {
    console.error('❌ Error: Could not find Xata API key');
    process.exit(1);
  }
}

console.log('✓ API key loaded\n');

// Initialize Xata client
const xata = new XataApiClient({
  apiKey: API_KEY,
  workspace: WORKSPACE
});

// Read schema
const schema = JSON.parse(readFileSync('data/legacy-import/xata-schema-all-legacy.json', 'utf8'));

console.log('🚀 Creating Legacy Tables via Xata SDK');
console.log('═══════════════════════════════════════');
console.log(`Database: ${DATABASE}`);
console.log(`Workspace: ${WORKSPACE}`);
console.log(`Branch: ${BRANCH}\n`);

// Create tables
async function createTables() {
  const results = {
    created: [],
    skipped: [],
    failed: []
  };

  for (const table of schema.tables) {
    try {
      console.log(`📋 Creating table: ${table.name}`);

      // Try to get existing table first
      try {
        const existing = await xata.table.getTableSchema({
          workspace: WORKSPACE,
          region: REGION,
          dbBranchName: `${DATABASE}:${BRANCH}`,
          tableName: table.name
        });

        if (existing) {
          console.log(`  ⚠️  Table ${table.name} already exists\n`);
          results.skipped.push(table.name);
          continue;
        }
      } catch (err) {
        // Table doesn't exist, continue to create
      }

      // Create table
      const response = await xata.table.createTable({
        workspace: WORKSPACE,
        region: REGION,
        dbBranchName: `${DATABASE}:${BRANCH}`,
        tableName: table.name
      });

      // Add columns
      for (const column of table.columns) {
        await xata.table.addTableColumn({
          workspace: WORKSPACE,
          region: REGION,
          dbBranchName: `${DATABASE}:${BRANCH}`,
          tableName: table.name,
          columnName: column.name,
          ...column
        });
      }

      console.log(`  ✅ Created ${table.name} with ${table.columns.length} columns\n`);
      results.created.push(table.name);

    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}\n`);
      results.failed.push({
        table: table.name,
        error: err.message
      });
    }
  }

  // Summary
  console.log('═══════════════════════════════════════');
  console.log('📊 Table Creation Summary');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Created: ${results.created.length}`);
  results.created.forEach(t => console.log(`   - ${t}`));

  if (results.skipped.length > 0) {
    console.log(`⚠️  Skipped: ${results.skipped.length}`);
    results.skipped.forEach(t => console.log(`   - ${t}`));
  }

  if (results.failed.length > 0) {
    console.log(`❌ Failed: ${results.failed.length}`);
    results.failed.forEach(f => console.log(`   - ${f.table}: ${f.error}`));
    process.exit(1);
  }

  console.log('\n✅ All tables ready for import!');
}

createTables().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
