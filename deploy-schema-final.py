#!/usr/bin/env python3
"""
Xata Schema Deployment - Final Version
Uses the schema endpoint that we confirmed works
"""
import requests
import json

# Configuration
API_KEY = "xau_46fql8kZYCHBseUclLr72fFYBbbdsuRQ1"
WORKSPACE = "Oliver-Timmerman-s-workspace-d3730u"
DATABASE = "Club19SalesOS"
BRANCH = "main"
REGION = "eu-central-1"

# Schema endpoint (confirmed working via GET)
SCHEMA_URL = f"https://{WORKSPACE}.{REGION}.xata.sh/db/{DATABASE}:{BRANCH}/schema"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

print("\n🚀 Xata Schema Deployment - Final\n")

# Load our desired schema
print("📖 Loading target schema...")
with open("xata-schema.json", "r") as f:
    target_schema = json.load(f)

print(f"   • Target: {len(target_schema['tables'])} tables\n")

# Upload the complete schema
print("📤 Uploading complete schema to Xata...")
print(f"   • Endpoint: {SCHEMA_URL}")
print(f"   • Method: POST\n")

response = requests.post(SCHEMA_URL, headers=headers, json=target_schema)

print(f"   • Status: {response.status_code}")

if response.status_code in [200, 201, 204]:
    print("   • Result: SUCCESS!\n")

    try:
        result = response.json()
        print("📊 Response Details:")
        print(json.dumps(result, indent=2))
    except:
        print("✓ Schema applied successfully (no response body)")

    print("\n✅ SCHEMA DEPLOYMENT COMPLETE!\n")
    print("🎉 All tables created:")
    for table in target_schema['tables']:
        print(f"   • {table['name']} ({len(table['columns'])} columns)")

    print("\n✨ Next step: Generate TypeScript client")
    print("   Run: npx xata codegen\n")

else:
    print(f"   • Result: FAILED\n")
    print(f"❌ Deployment Error:")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.text}\n")

    # Try PUT method as alternative
    print("📤 Trying alternative: PUT method...")
    response = requests.put(SCHEMA_URL, headers=headers, json=target_schema)

    print(f"   • Status: {response.status_code}")

    if response.status_code in [200, 201, 204]:
        print("   • Result: SUCCESS!\n")
        print("✅ SCHEMA DEPLOYED VIA PUT!\n")
        print("✨ Next: Run 'npx xata codegen'\n")
    else:
        print(f"   • Result: FAILED")
        print(f"   Response: {response.text[:200]}\n")
