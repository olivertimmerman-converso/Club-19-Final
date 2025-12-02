#!/usr/bin/env python3
"""
Xata Table Creator for Club 19 Sales OS

Creates tables one by one via Xata HTTP API using table creation endpoint
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

print("\n🚀 Creating Club 19 Sales OS Tables...\n")

# Define tables with columns
tables = [
    {
        "name": "Shoppers",
        "columns": [
            {"name": "name", "type": "string"},
            {"name": "email", "type": "string"},
            {"name": "commission_scheme", "type": "text"},
            {"name": "active", "type": "bool"}
        ]
    },
    {
        "name": "Buyers",
        "columns": [
            {"name": "name", "type": "string"},
            {"name": "email", "type": "string"},
            {"name": "xero_contact_id", "type": "string"}
        ]
    },
    {
        "name": "Suppliers",
        "columns": [
            {"name": "name", "type": "string"},
            {"name": "email", "type": "string"},
            {"name": "xero_contact_id", "type": "string"}
        ]
    },
    {
        "name": "Introducers",
        "columns": [
            {"name": "name", "type": "string"},
            {"name": "commission_percent", "type": "float"}
        ]
    },
    {
        "name": "CommissionBands",
        "columns": [
            {"name": "band_type", "type": "string"},
            {"name": "min_threshold", "type": "float"},
            {"name": "max_threshold", "type": "float"},
            {"name": "commission_percent", "type": "float"}
        ]
    }
]

# Step 1: Create each lookup table
print(f"📝 Creating lookup tables...\n")
for table in tables:
    print(f"Creating table: {table['name']}...")

    # Create table
    response = requests.post(
        f"{BASE_URL}/db/{DATABASE}:main/tables",
        headers=headers,
        json={"name": table["name"]}
    )

    if response.status_code in [200, 201]:
        print(f"  ✅ Table '{table['name']}' created")

        # Add columns
        for column in table['columns']:
            col_response = requests.post(
                f"{BASE_URL}/db/{DATABASE}:main/tables/{table['name']}/columns",
                headers=headers,
                json=column
            )
            if col_response.status_code in [200, 201]:
                print(f"    • Column '{column['name']}' added ({column['type']})")
            else:
                print(f"    ⚠️ Column '{column['name']}' failed: {col_response.text}")
    else:
        print(f"  ⚠️ Failed: {response.text}")

    time.sleep(0.5)  # Small delay between tables

# Step 2: Create Sales table with all fields including links
print(f"\n📊 Creating Sales table with full schema...\n")

sales_columns = [
    {"name": "sale_reference", "type": "string"},
    {"name": "sale_date", "type": "datetime"},
    {"name": "shopper", "type": "link", "link": {"table": "Shoppers"}},
    {"name": "buyer", "type": "link", "link": {"table": "Buyers"}},
    {"name": "supplier", "type": "link", "link": {"table": "Suppliers"}},
    {"name": "introducer", "type": "link", "link": {"table": "Introducers"}},
    {"name": "brand", "type": "string"},
    {"name": "category", "type": "string"},
    {"name": "item_title", "type": "string"},
    {"name": "quantity", "type": "int"},
    {"name": "sale_amount_inc_vat", "type": "float"},
    {"name": "sale_amount_ex_vat", "type": "float"},
    {"name": "buy_price", "type": "float"},
    {"name": "card_fees", "type": "float"},
    {"name": "shipping_cost", "type": "float"},
    {"name": "direct_costs", "type": "float"},
    {"name": "implied_shipping", "type": "float"},
    {"name": "gross_margin", "type": "float"},
    {"name": "commissionable_margin", "type": "float"},
    {"name": "currency", "type": "string"},
    {"name": "branding_theme", "type": "string"},
    {"name": "xero_invoice_number", "type": "string"},
    {"name": "xero_invoice_id", "type": "string"},
    {"name": "xero_invoice_url", "type": "string"},
    {"name": "invoice_status", "type": "string"},
    {"name": "invoice_paid_date", "type": "datetime"},
    {"name": "commission_locked", "type": "bool"},
    {"name": "commission_paid", "type": "bool"},
    {"name": "commission_lock_date", "type": "datetime"},
    {"name": "commission_paid_date", "type": "datetime"},
    {"name": "commission_band", "type": "link", "link": {"table": "CommissionBands"}},
    {"name": "internal_notes", "type": "text"}
]

# Create Sales table
response = requests.post(
    f"{BASE_URL}/db/{DATABASE}:main/tables",
    headers=headers,
    json={"name": "Sales"}
)

if response.status_code in [200, 201]:
    print(f"✅ Sales table created")

    # Add all columns
    for column in sales_columns:
        col_response = requests.post(
            f"{BASE_URL}/db/{DATABASE}:main/tables/Sales/columns",
            headers=headers,
            json=column
        )
        if col_response.status_code in [200, 201]:
            col_type = f"{column['type']}"
            if column['type'] == 'link':
                col_type += f" -> {column['link']['table']}"
            print(f"  • {column['name']} ({col_type})")
        else:
            print(f"  ⚠️ Column '{column['name']}' failed: {col_response.text}")
else:
    print(f"⚠️ Sales table creation failed: {response.text}")

print(f"\n🎉 SCHEMA CREATION COMPLETE!")
print(f"\n📋 Summary:")
print(f"  • Shoppers (4 columns)")
print(f"  • Buyers (3 columns)")
print(f"  • Suppliers (3 columns)")
print(f"  • Introducers (2 columns)")
print(f"  • CommissionBands (4 columns)")
print(f"  • Sales (32 columns with 5 relationships)")
print(f"\n✓ Database ready!")
