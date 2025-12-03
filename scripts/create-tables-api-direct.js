const fs = require('fs');
const https = require('https');

// Configuration
const WORKSPACE = 'Oliver-Timmerman-s-workspace-d3730u';
const REGION = 'eu-central-1';
const DATABASE = 'Club19SalesOS';
const BRANCH = 'main';

// Get API key
let API_KEY = process.env.XATA_API_KEY;

if (!API_KEY) {
  try {
    const credPath = require('os').homedir() + '/.config/xata/credentials';
    const credContent = fs.readFileSync(credPath, 'utf8');
    const match = credContent.match(/apiKey=([^\n\r]+)/);
    if (match) {
      API_KEY = match[1];
    }
  } catch (err) {
    console.error('❌ Error: Could not find Xata API key');
    console.error('Run: npx xata auth login');
    process.exit(1);
  }
}

console.log('✓ API key loaded');

// Make authenticated HTTPS request
async function makeRequest(method, path, data = null) {
  const url = `https://${WORKSPACE}.${REGION}.xata.sh${path}`;

  const dataBuffer = data ? Buffer.from(JSON.stringify(data), 'utf8') : null;

  return new Promise((resolve, reject) => {
    const options = {
      method: method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    if (dataBuffer) {
      options.headers['Content-Length'] = dataBuffer.length;
    }

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const result = {
          statusCode: res.statusCode,
          body: body,
          parsed: null
        };

        try {
          result.parsed = JSON.parse(body);
        } catch (e) {
          // Keep as string
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(result);
        } else {
          reject(result);
        }
      });
    });

    req.on('error', reject);
    if (dataBuffer) {
      req.write(dataBuffer);
    }
    req.end();
  });
}

// Check if table exists
async function tableExists(tableName) {
  try {
    const result = await makeRequest('GET', `/db/${DATABASE}:${BRANCH}/tables/${tableName}`);
    return true;
  } catch (err) {
    if (err.statusCode === 404) {
      return false;
    }
    throw err;
  }
}

// Create table using schema API
async function createTable(tableSchema) {
  const tableName = tableSchema.name;

  console.log(`\n📋 Creating table: ${tableName}`);

  // Check if exists first
  const exists = await tableExists(tableName);
  if (exists) {
    console.log(`  ⚠️  Table ${tableName} already exists, skipping...`);
    return { skipped: true };
  }

  // Try multiple API endpoints
  const endpoints = [
    `/db/${DATABASE}:${BRANCH}/tables`,
    `/db/${DATABASE}/branches/${BRANCH}/tables`,
    `/dbs/${DATABASE}/branches/${BRANCH}/schema/tables`
  ];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      console.log(`  Trying endpoint: ${endpoint}`);
      const result = await makeRequest('POST', endpoint, {
        name: tableName,
        columns: tableSchema.columns
      });

      console.log(`  ✅ Table ${tableName} created successfully`);
      console.log(`     Columns: ${tableSchema.columns.length}`);
      return result.parsed;
    } catch (err) {
      lastError = err;
      console.log(`  ❌ Failed (${err.statusCode}): ${err.body?.substring(0, 100)}`);
    }
  }

  throw new Error(`All endpoints failed for ${tableName}. Last error: ${JSON.stringify(lastError)}`);
}

// Main function
async function main() {
  console.log('\n🚀 Creating Legacy Tables via REST API');
  console.log('═══════════════════════════════════════');
  console.log(`Database: ${DATABASE}`);
  console.log(`Workspace: ${WORKSPACE}`);
  console.log(`Branch: ${BRANCH}\n`);

  // Read schema
  const schemaPath = 'data/legacy-import/xata-schema-all-legacy.json';
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

  const results = {
    created: [],
    skipped: [],
    failed: []
  };

  // Create tables in order (suppliers and clients first, then trades)
  for (const table of schema.tables) {
    try {
      const result = await createTable(table);
      if (result.skipped) {
        results.skipped.push(table.name);
      } else {
        results.created.push(table.name);
      }
    } catch (err) {
      console.error(`\n❌ Failed to create ${table.name}:`);
      console.error(err.message);
      results.failed.push({
        table: table.name,
        error: err.message
      });
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════');
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
    results.failed.forEach(f => console.log(`   - ${f.table}: ${f.error.substring(0, 100)}`));

    console.log('\n⚠️  FALLBACK REQUIRED ⚠️');
    console.log('─────────────────────────');
    console.log('The REST API does not allow table creation via standard endpoints.');
    console.log('Please create tables manually via Xata Web UI:\n');
    console.log('1. Go to: https://app.xata.io');
    console.log('2. Navigate to: Oliver-Timmerman-s-workspace-d3730u / Club19SalesOS / main');
    console.log('3. Follow instructions in: MANUAL_TABLE_CREATION_GUIDE.md\n');
    console.log('After creating tables, run: node scripts/import-to-xata.js');

    process.exit(1);
  }

  console.log('\n✅ All tables ready for import!');
  console.log('Next step: node scripts/import-to-xata.js');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
