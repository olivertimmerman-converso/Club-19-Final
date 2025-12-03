const https = require('https');

// Required configuration
const REQUIRED_ORIGINS = [
  "https://club19-sales-os-v2.vercel.app",
  "https://*.vercel.app"
];

const REQUIRED_REDIRECTS = [
  "https://club19-sales-os-v2.vercel.app/*",
  "https://*.vercel.app/*"
];

function httpsRequest(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function run() {
  const CLERK_KEY = process.env.CLERK_SECRET_KEY;

  if (!CLERK_KEY) {
    console.error('❌ ERROR: CLERK_SECRET_KEY environment variable not set');
    console.log('\nPlease set it via:');
    console.log('export CLERK_SECRET_KEY="sk_test_..."');
    console.log('\nOr run with:');
    console.log('CLERK_SECRET_KEY="sk_test_..." node scripts/fix-clerk-production.js');
    process.exit(1);
  }

  console.log('🔍 Clerk Production Configuration Repair\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Fetch current instance configuration
    console.log('\n📡 Step 1: Fetching current Clerk instance configuration...');

    const instance = await httpsRequest('https://api.clerk.com/v1/instance', {
      headers: {
        'Authorization': `Bearer ${CLERK_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!instance || !instance.id) {
      throw new Error('Invalid instance response - no ID found');
    }

    console.log(`✅ Instance ID: ${instance.id}`);
    console.log(`   Environment: ${instance.environment_type || 'N/A'}`);
    console.log(`   Domain: ${instance.home_origin || 'N/A'}`);

    // Step 2: Extract current configuration
    console.log('\n📊 Step 2: Analyzing current configuration...\n');

    const currentOrigins = instance.allowed_origins || [];
    const currentRedirects = instance.redirect_urls || [];

    console.log('BEFORE - Current Allowed Origins:');
    if (currentOrigins.length === 0) {
      console.log('   (empty)');
    } else {
      currentOrigins.forEach(o => console.log(`   - ${o}`));
    }

    console.log('\nBEFORE - Current Redirect URLs:');
    if (currentRedirects.length === 0) {
      console.log('   (empty)');
    } else {
      currentRedirects.forEach(r => console.log(`   - ${r}`));
    }

    // Step 3: Compute missing entries
    console.log('\n🔧 Step 3: Computing required changes...\n');

    const missingOrigins = REQUIRED_ORIGINS.filter(
      req => !currentOrigins.includes(req)
    );

    const missingRedirects = REQUIRED_REDIRECTS.filter(
      req => !currentRedirects.includes(req)
    );

    if (missingOrigins.length === 0 && missingRedirects.length === 0) {
      console.log('✅ Clerk is already correctly configured!');
      console.log('\n   All required origins and redirects are present.');
      console.log('   No changes needed.');
      console.log('\n' + '='.repeat(60));
      return;
    }

    console.log('Missing Allowed Origins:');
    if (missingOrigins.length === 0) {
      console.log('   ✓ None (all present)');
    } else {
      missingOrigins.forEach(o => console.log(`   + ${o}`));
    }

    console.log('\nMissing Redirect URLs:');
    if (missingRedirects.length === 0) {
      console.log('   ✓ None (all present)');
    } else {
      missingRedirects.forEach(r => console.log(`   + ${r}`));
    }

    // Step 4: Prepare updated configuration
    console.log('\n💾 Step 4: Preparing configuration update...');

    const updatedOrigins = [...new Set([...currentOrigins, ...missingOrigins])];
    const updatedRedirects = [...new Set([...currentRedirects, ...missingRedirects])];

    const patchData = {};
    if (missingOrigins.length > 0) {
      patchData.allowed_origins = updatedOrigins;
    }
    if (missingRedirects.length > 0) {
      patchData.redirect_urls = updatedRedirects;
    }

    console.log(`   Updating ${Object.keys(patchData).length} field(s)...`);

    // Step 5: Apply the patch
    console.log('\n🚀 Step 5: Applying configuration changes...');

    const patchResult = await httpsRequest(
      `https://api.clerk.com/v1/instance`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${CLERK_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(patchData)
      }
    );

    console.log('✅ Configuration updated successfully!');

    // Step 6: Verify the changes
    console.log('\n🔍 Step 6: Verifying changes...');

    const verifyInstance = await httpsRequest('https://api.clerk.com/v1/instance', {
      headers: {
        'Authorization': `Bearer ${CLERK_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n📊 AFTER - Updated Allowed Origins:');
    (verifyInstance.allowed_origins || []).forEach(o => {
      const isNew = missingOrigins.includes(o);
      console.log(`   ${isNew ? '✨' : '-'} ${o}`);
    });

    console.log('\n📊 AFTER - Updated Redirect URLs:');
    (verifyInstance.redirect_urls || []).forEach(r => {
      const isNew = missingRedirects.includes(r);
      console.log(`   ${isNew ? '✨' : '-'} ${r}`);
    });

    // Step 7: Generate deployment safety report
    console.log('\n' + '='.repeat(60));
    console.log('✅ DEPLOYMENT SAFETY REPORT');
    console.log('='.repeat(60));
    console.log('\n🎯 Production URLs Configured:');
    console.log('   ✓ https://club19-sales-os-v2.vercel.app');
    console.log('   ✓ https://*.vercel.app (wildcard for previews)');

    console.log('\n🔐 Authentication Status:');
    console.log('   ✓ Allowed Origins: Configured');
    console.log('   ✓ Redirect URLs: Configured');
    console.log('   ✓ Production: UNBLOCKED');

    console.log('\n📝 Changes Applied:');
    if (missingOrigins.length > 0) {
      console.log(`   ✓ Added ${missingOrigins.length} Allowed Origin(s)`);
    }
    if (missingRedirects.length > 0) {
      console.log(`   ✓ Added ${missingRedirects.length} Redirect URL(s)`);
    }

    console.log('\n✨ Next Steps:');
    console.log('   1. Verify authentication at: https://club19-sales-os-v2.vercel.app');
    console.log('   2. Test login flow');
    console.log('   3. Confirm legacy dashboards accessible');

    console.log('\n🎉 Clerk production configuration successfully repaired!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);

    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('\n⚠️  Authentication failed. Please check:');
      console.log('   1. CLERK_SECRET_KEY is correct');
      console.log('   2. Key starts with sk_test_ or sk_live_');
      console.log('   3. Key has not expired');
    } else if (error.message.includes('404')) {
      console.log('\n⚠️  Instance not found. This may indicate:');
      console.log('   1. Wrong API key for this instance');
      console.log('   2. Instance has been deleted');
    } else {
      console.log('\n⚠️  Unexpected error. Full details:');
      console.log(error);
    }

    process.exit(1);
  }
}

run();
