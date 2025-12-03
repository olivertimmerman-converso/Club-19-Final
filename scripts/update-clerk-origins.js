const https = require('https');

async function run() {
  const CLERK_KEY = process.env.CLERK_SECRET_KEY;
  if (!CLERK_KEY) {
    console.error('❌ Missing CLERK_SECRET_KEY environment variable.');
    return;
  }

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
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      });

      req.on('error', reject);
      if (options.body) req.write(options.body);
      req.end();
    });
  }

  console.log('📡 Fetching current Clerk instance settings...\n');

  // 1. Fetch current instance settings
  const instance = await httpsRequest('https://api.clerk.com/v1/instances', {
    headers: {
      Authorization: `Bearer ${CLERK_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!instance || !instance.id) {
    console.error('❌ Could not fetch instance details');
    console.log('Response:', JSON.stringify(instance, null, 2));
    return;
  }

  console.log('BEFORE - Current allowed origins:');
  console.log(JSON.stringify(instance.allowed_origins || [], null, 2));
  console.log();

  // 2. Prepare updated origins
  const required = [
    'https://club19-sales-os-v2.vercel.app',
    'https://*.vercel.app'
  ];

  const currentOrigins = instance.allowed_origins || [];
  const updated = Array.from(new Set([...currentOrigins, ...required]));

  if (updated.length === currentOrigins.length) {
    console.log('✅ All required domains already present');
    console.log('\nFinal allowed origins:', JSON.stringify(updated, null, 2));
    return;
  }

  console.log('🔄 Adding new domains:', required.filter(r => !currentOrigins.includes(r)));
  console.log();

  // 3. Send update request
  const patchResult = await httpsRequest(`https://api.clerk.com/v1/instances/${instance.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${CLERK_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      allowed_origins: updated
    })
  });

  console.log('AFTER - Updated allowed origins:');
  console.log(JSON.stringify(patchResult.allowed_origins || [], null, 2));
  console.log();

  // 4. Verify
  console.log('🔍 Re-fetching to verify...\n');
  const verifyResult = await httpsRequest('https://api.clerk.com/v1/instances', {
    headers: {
      Authorization: `Bearer ${CLERK_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('VERIFIED - Final allowed origins:');
  console.log(JSON.stringify(verifyResult.allowed_origins || [], null, 2));
  console.log();

  console.log('✅ Clerk Allowed Origins updated successfully');
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
