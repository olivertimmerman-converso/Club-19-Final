#!/usr/bin/env python3
"""
Xata Schema Deployment - Version 3
Uses data plane endpoint that we know works
"""
import requests
import json

# Configuration
API_KEY = "xau_46fql8kZYCHBseUclLr72fFYBbbdsuRQ1"
WORKSPACE = "Oliver-Timmerman-s-workspace-d3730u"
DATABASE = "Club19SalesOS"
BRANCH = "main"
REGION = "eu-central-1"

# Data plane endpoint format (we know this works from query test)
BASE_URL = f"https://{WORKSPACE}.{REGION}.xata.sh/db/{DATABASE}:{BRANCH}"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

print("\n🚀 Xata Schema Deployment v3 (Data Plane)\n")

# Load schema
print("📖 Loading schema...")
with open("xata-schema.json", "r") as f:
    schema = json.load(f)

print(f"   • Found {len(schema['tables'])} tables to create\n")

# Create each table individually using the data plane
print("📤 Creating tables via data plane API...\n")

success_count = 0
failed_tables = []

for table in schema['tables']:
    table_name = table['name']
    print(f"Creating table: {table_name}...")

    # Create table
    url = f"{BASE_URL}/tables"
    response = requests.post(url, headers=headers, json={"name": table_name})

    if response.status_code in [200, 201]:
        print(f"  ✅ Table created")

        # Add columns
        for column in table['columns']:
            col_url = f"{BASE_URL}/tables/{table_name}/columns"
            col_response = requests.post(col_url, headers=headers, json=column)

            if col_response.status_code in [200, 201]:
                col_type = column['type']
                if column['type'] == 'link':
                    col_type += f" → {column['link']['table']}"
                print(f"    • {column['name']} ({col_type})")
            else:
                print(f"    ⚠️ Column '{column['name']}' failed: {col_response.text[:100]}")

        success_count += 1
        print()

    elif "already exists" in response.text.lower():
        print(f"  ⚠️ Table already exists, skipping...")
        success_count += 1
        print()

    else:
        print(f"  ❌ Failed: {response.status_code}")
        print(f"     Response: {response.text[:200]}")
        failed_tables.append(table_name)
        print()

# Summary
print("\n" + "="*60)
if success_count == len(schema['tables']):
    print("✅ ALL TABLES CREATED SUCCESSFULLY!")
    print(f"\n🎉 Database Schema Complete:")
    for table in schema['tables']:
        print(f"   • {table['name']} ({len(table['columns'])} columns)")

    print(f"\n✨ Next step: Run 'npx xata codegen' to generate TypeScript client")
else:
    print(f"⚠️ PARTIAL SUCCESS: {success_count}/{len(schema['tables'])} tables created")
    if failed_tables:
        print(f"\nFailed tables:")
        for t in failed_tables:
            print(f"   • {t}")
