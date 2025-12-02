#!/usr/bin/env python3
"""
Xata Schema Creator for Club 19 Sales OS

Creates complete database schema with 6 tables via Xata HTTP API
"""
import requests
import json
import time

# Configuration
API_KEY = "xau_46fql8kZYCHBseUclLr72fFYBbbdsuRQ1"
WORKSPACE = "Oliver-Timmerman-s-workspace-d3730u"
DATABASE = "Club19SalesOS"
BRANCH = "main"
REGION = "eu-central-1"

BASE_URL = f"https://{WORKSPACE}.{REGION}.xata.sh"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

print("\n🚀 Creating Club 19 Sales OS - Xata Schema...\n")

# Step 1: Load schema
print(f"\n📖 Loading schema from xata-schema.json...")
with open("xata-schema.json", "r") as f:
    schema = json.load(f)

# Step 2: Apply schema using correct endpoint format
print(f"📤 Uploading schema to Xata...")
response = requests.put(
    f"{BASE_URL}/db/{DATABASE}/branches/{BRANCH}/schema",
    headers=headers,
    json=schema
)

if response.status_code in [200, 201]:
    print(f"✅ Schema uploaded successfully!")
    result = response.json()
    print(f"\n📊 Schema Status:")
    print(json.dumps(result, indent=2))
else:
    print(f"❌ Failed to upload schema")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    exit(1)

print("\n🎉 SCHEMA CREATED SUCCESSFULLY!")
print(f"\n📋 Tables Created:")
for table in schema["tables"]:
    print(f"  • {table['name']} ({len(table['columns'])} columns)")

print("\n✓ Database ready for use!")
