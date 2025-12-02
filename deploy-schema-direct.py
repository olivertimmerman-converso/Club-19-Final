#!/usr/bin/env python3
"""
Direct Xata Schema Deployment
Uses REST API to bypass CLI TTY requirements
"""
import requests
import json

# Configuration
API_KEY = "xau_46fql8kZYCHBseUclLr72fFYBbbdsuRQ1"
WORKSPACE = "Oliver-Timmerman-s-workspace-d3730u"
DATABASE = "Club19SalesOS"
BRANCH = "main"
REGION = "eu-central-1"

# Correct API endpoint format
API_BASE = f"https://{WORKSPACE}.{REGION}.xata.sh"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

print("\n🚀 Deploying Xata Schema via REST API...\n")

# Load schema
print("📖 Loading schema...")
with open("xata-schema.json", "r") as f:
    schema = json.load(f)

print(f"   • Found {len(schema['tables'])} tables to create\n")

# Deploy schema to main branch
print("📤 Uploading to main branch...")
url = f"{API_BASE}/db/{DATABASE}/branches/{BRANCH}/schema"

print(f"   • Endpoint: {url}")
print(f"   • Method: PUT")

response = requests.put(url, headers=headers, json=schema)

print(f"   • Response Status: {response.status_code}\n")

if response.status_code in [200, 201, 204]:
    print("✅ SCHEMA DEPLOYED SUCCESSFULLY!\n")

    # Parse response
    try:
        result = response.json()
        print("📊 Deployment Details:")
        print(json.dumps(result, indent=2))
    except:
        print("✓ Schema applied (no response body)")

    print("\n🎉 All tables created:")
    for table in schema['tables']:
        print(f"   • {table['name']} ({len(table['columns'])} columns)")

    print("\n✨ Next step: Run 'npx xata codegen' to generate TypeScript client")

else:
    print(f"❌ DEPLOYMENT FAILED\n")
    print(f"Status Code: {response.status_code}")
    print(f"Response Body:")
    print(response.text)
    print("\n")

    # Try to parse error
    try:
        error = response.json()
        print("Error Details:")
        print(json.dumps(error, indent=2))
    except:
        pass
