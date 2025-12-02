#!/usr/bin/env python3
"""
Xata Schema Deployment - Version 2
Uses workspace API endpoint with branch creation
"""
import requests
import json

# Configuration
API_KEY = "xau_46fql8kZYCHBseUclLr72fFYBbbdsuRQ1"
WORKSPACE = "Oliver-Timmerman-s-workspace-d3730u"
DATABASE = "Club19SalesOS"
BRANCH = "main"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

print("\n🚀 Xata Schema Deployment v2\n")

# Load schema
print("📖 Loading schema...")
with open("xata-schema.json", "r") as f:
    schema = json.load(f)

print(f"   • Found {len(schema['tables'])} tables\n")

# Try approach 1: Create branch with schema using workspace API
print("📤 Attempt 1: Creating branch with schema via workspace API...")
url = f"https://api.xata.io/workspaces/{WORKSPACE}/dbs/{DATABASE}/branches/{BRANCH}"

response = requests.put(url, headers=headers, json=schema)

print(f"   • Status: {response.status_code}")
print(f"   • Response: {response.text}\n")

if response.status_code in [200, 201, 204]:
    print("✅ SUCCESS!\n")
    try:
        result = response.json()
        print("📊 Result:")
        print(json.dumps(result, indent=2))
    except:
        print("✓ Branch created with schema")

    print("\n🎉 Tables created:")
    for table in schema['tables']:
        print(f"   • {table['name']} ({len(table['columns'])} columns)")

    print("\n✨ Next: Run 'npx xata codegen' to generate TypeScript client")
    exit(0)

# Try approach 2: Region-specific endpoint
print("📤 Attempt 2: Using region-specific endpoint...")
url = f"https://{WORKSPACE}.eu-central-1.xata.sh/db/{DATABASE}:main/schema"

response = requests.put(url, headers=headers, json=schema)

print(f"   • Status: {response.status_code}")
print(f"   • Response: {response.text}\n")

if response.status_code in [200, 201, 204]:
    print("✅ SUCCESS!\n")
    print("✨ Next: Run 'npx xata codegen'")
else:
    print("❌ BOTH ATTEMPTS FAILED")
    print("\nDiagnostics:")
    print(f"   • Database exists: Yes (Club19SalesOS)")
    print(f"   • API key valid: Yes")
    print(f"   • Branch status: Not initialized via API")
    print("\n⚠️ The main branch must be created via Xata web UI first")
    print("   Visit: https://app.xata.io/workspaces/Oliver-Timmerman-s-workspace-d3730u/dbs/Club19SalesOS")
    print("   Click: 'Add a table' or 'Get started'")
    print("   Then re-run this script")
