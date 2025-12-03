const { chromium } = require('playwright');

async function run() {
  console.log("🚀 Launching browser...");
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log("📱 Opening Clerk dashboard login...");
    await page.goto("https://dashboard.clerk.com");

    console.log("\n⏳ WAITING FOR YOU TO LOG IN MANUALLY...");
    console.log("   Please complete the login in the browser window.");
    console.log("   This script will continue automatically once logged in.\n");

    // Wait for dashboard to load (settings menu appears after login)
    await page.waitForSelector('text=Settings', { timeout: 0 });

    console.log("✅ Login detected! Navigating to Settings...");
    await page.waitForTimeout(1000);

    // Click Settings in sidebar
    await page.click('text=Settings');
    await page.waitForTimeout(1000);

    console.log("📋 Opening Domains & URLs...");
    // Look for Domains & URLs option
    await page.click('text=Domains');
    await page.waitForTimeout(1000);

    console.log("🌐 Accessing Allowed Origins section...");

    // Try to find and read current origins
    // Clerk UI may have different selectors, so we'll try multiple approaches
    let before = [];

    try {
      // Try common selectors for origin lists
      const possibleSelectors = [
        '[data-testid*="origin"]',
        '[data-testid*="domain"]',
        'input[type="url"]',
        'input[placeholder*="https"]',
        '[role="textbox"]'
      ];

      for (const selector of possibleSelectors) {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          const values = await page.$$eval(selector, els =>
            els.map(e => e.value || e.innerText || e.textContent).filter(Boolean)
          );
          if (values.length > 0) {
            before = values;
            break;
          }
        }
      }
    } catch (e) {
      console.log("Note: Could not auto-detect existing origins, will proceed to add new ones");
    }

    console.log("\n📊 BEFORE - Current allowed origins:");
    if (before.length > 0) {
      before.forEach(origin => console.log(`   - ${origin}`));
    } else {
      console.log("   (Unable to automatically read, will add domains)");
    }

    // Required domains
    const required = [
      "https://club19-sales-os-v2.vercel.app",
      "https://*.vercel.app"
    ];

    console.log("\n➕ Adding required domains if missing...");

    // Look for "Add" or "Add origin" or "Add domain" button
    const addButtonSelectors = [
      'button:has-text("Add")',
      'button:has-text("add")',
      'button:has-text("Add origin")',
      'button:has-text("Add domain")',
      '[aria-label*="Add"]'
    ];

    for (const domain of required) {
      const alreadyExists = before.some(o => o.includes(domain));

      if (alreadyExists) {
        console.log(`   ✓ ${domain} (already exists)`);
        continue;
      }

      console.log(`   + Adding: ${domain}`);

      // Try to click add button
      let addClicked = false;
      for (const selector of addButtonSelectors) {
        try {
          await page.click(selector, { timeout: 2000 });
          addClicked = true;
          break;
        } catch (e) {
          continue;
        }
      }

      if (!addClicked) {
        console.log("   ⚠️  Could not find 'Add' button automatically");
        console.log("   Please manually add this domain in the UI");
        continue;
      }

      await page.waitForTimeout(500);

      // Try to fill input field
      const inputSelectors = [
        'input[placeholder*="https"]',
        'input[placeholder*="example"]',
        'input[placeholder*="domain"]',
        'input[placeholder*="origin"]',
        'input[type="url"]',
        'input[type="text"]:visible'
      ];

      let inputFilled = false;
      for (const selector of inputSelectors) {
        try {
          await page.fill(selector, domain, { timeout: 2000 });
          inputFilled = true;
          break;
        } catch (e) {
          continue;
        }
      }

      if (!inputFilled) {
        console.log("   ⚠️  Could not find input field automatically");
        console.log("   Please manually enter this domain in the UI");
        continue;
      }

      // Try to confirm (Enter key or Save button)
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1000);
    }

    // Try to read updated origins
    let after = [];
    try {
      const possibleSelectors = [
        '[data-testid*="origin"]',
        '[data-testid*="domain"]',
        'input[type="url"]',
        'input[placeholder*="https"]',
        '[role="textbox"]'
      ];

      for (const selector of possibleSelectors) {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          const values = await page.$$eval(selector, els =>
            els.map(e => e.value || e.innerText || e.textContent).filter(Boolean)
          );
          if (values.length > 0) {
            after = values;
            break;
          }
        }
      }
    } catch (e) {
      console.log("Note: Could not auto-read updated origins");
    }

    console.log("\n📊 AFTER - Updated allowed origins:");
    if (after.length > 0) {
      after.forEach(origin => console.log(`   - ${origin}`));
    } else {
      console.log("   (Please verify manually in the UI)");
    }

    // Try to save
    console.log("\n💾 Looking for Save button...");
    const saveSelectors = [
      'button:has-text("Save")',
      'button:has-text("save")',
      'button[type="submit"]',
      '[aria-label*="Save"]'
    ];

    let saved = false;
    for (const selector of saveSelectors) {
      try {
        await page.click(selector, { timeout: 2000 });
        saved = true;
        console.log("✅ Save button clicked!");
        break;
      } catch (e) {
        continue;
      }
    }

    if (!saved) {
      console.log("⚠️  Could not find Save button automatically");
      console.log("   Please manually save the changes in the UI");
    }

    await page.waitForTimeout(2000);

    console.log("\n✅ Clerk Allowed Origins update process complete!");
    console.log("\n📋 SUMMARY:");
    console.log("   Required domains:");
    required.forEach(d => console.log(`     - ${d}`));
    console.log("\n   Please verify in the Clerk Dashboard UI that both domains are listed.");
    console.log("   The browser will remain open for manual verification.");

    console.log("\n⚠️  IMPORTANT: If the UI doesn't match expectations, please:");
    console.log("   1. Manually navigate to: Settings → Domains & URLs");
    console.log("   2. Find the 'Allowed Origins' section");
    console.log("   3. Add both domains if not present");
    console.log("   4. Click Save");

    // Keep browser open for verification
    console.log("\nBrowser will remain open. Close manually when done.");

  } catch (error) {
    console.error("\n❌ Error during automation:", error.message);
    console.log("\n⚠️  FALLBACK: Please complete manually:");
    console.log("   1. In the open browser, navigate to Settings → Domains & URLs");
    console.log("   2. Find 'Allowed Origins' section");
    console.log("   3. Add these domains:");
    console.log("      - https://club19-sales-os-v2.vercel.app");
    console.log("      - https://*.vercel.app");
    console.log("   4. Click Save");

    // Keep browser open for manual completion
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
