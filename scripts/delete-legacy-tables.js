const https = require('https');
const fs = require('fs');

const API_KEY = fs.readFileSync(require('os').homedir() + '/.config/xata/credentials', 'utf8').match(/apiKey=([^\n\r]+)/)[1];

async function deleteTable(tableName) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'Oliver-Timmerman-s-workspace-d3730u.eu-central-1.xata.sh',
      path: `/db/Club19SalesOS:main/tables/${tableName}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✓ Deleted ${tableName}`);
          resolve();
        } else {
          console.log(`⚠️  Could not delete ${tableName}: ${body.substring(0, 100)}`);
          resolve(); // Don't fail, just continue
        }
      });
    });

    req.on('error', (err) => {
      console.log(`⚠️  Error deleting ${tableName}: ${err.message}`);
      resolve();
    });

    req.end();
  });
}

async function main() {
  console.log('🗑️  Deleting legacy tables...\n');

  await deleteTable('legacy_trades');
  await deleteTable('legacy_clients');
  await deleteTable('legacy_suppliers');

  console.log('\n✅ Tables deleted (or were already missing)');
  console.log('\nNext: Create tables in Xata Web UI using correct schema');
  console.log('See: MANUAL_TABLE_CREATION_GUIDE.md');
}

main();
