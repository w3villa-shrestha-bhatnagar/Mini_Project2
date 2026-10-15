#!/usr/bin/env python3
"""
MongoDB Connection Tester & Data Migration Utility for AuraMart
Usage:
    python migrate_to_mongo.py [--sync] [--check]
"""

import asyncio
import json
import os
import sys
import time

# Ensure app package and virtualenv packages are importable
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Add venv site-packages so system python3 works seamlessly
for venv_name in ["venv", ".venv"]:
    venv_site = os.path.join(backend_dir, venv_name, "lib", "python3.12", "site-packages")
    if os.path.exists(venv_site) and venv_site not in sys.path:
        sys.path.insert(0, venv_site)

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

def mask_uri(uri: str) -> str:
    if "@" in uri:
        prefix = uri.split("@")[0].split("://")[0] + "://"
        host_part = uri.split("@")[1]
        return f"{prefix}****:****@{host_part}"
    return uri

async def main():
    args = [a.lower().strip("[]") for a in sys.argv[1:]]
    sync_mode = "--sync" in args or "sync" in args
    check_mode = "--check" in args or "check" in args or not sync_mode

    print("=" * 65)
    print("🍃 AuraMart MongoDB Connection & Migration Utility")
    print("=" * 65)
    print(f"Target Database URI: {mask_uri(settings.MONGODB_URI)}")
    print(f"Target Database Name: {settings.MONGODB_DB_NAME}")
    print("-" * 65)

    client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
    db = client[settings.MONGODB_DB_NAME]

    print("Testing connection to MongoDB...")
    start_time = time.time()
    try:
        await client.admin.command('ping')
        latency = (time.time() - start_time) * 1000
        print(f"✅ Connection successful! Ping latency: {latency:.1f}ms")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("\n💡 Troubleshooting Tips:")
        print("  1. If using MongoDB Atlas (Cloud):")
        print("     - Ensure your IP address is whitelisted in Atlas (Network Access -> Add IP -> 0.0.0.0/0 or your current IP).")
        print("     - Verify your username and password in the connection string.")
        print("     - URL-encode any special characters in your password (e.g., @ becomes %40).")
        print("  2. If using local MongoDB:")
        print("     - Ensure MongoDB server is running: `sudo systemctl status mongod` or `mongod`.")
        print("     - Verify the port (default 27017).")
        client.close()
        return

    # Check collections
    collections = await db.list_collection_names()
    print(f"\n📂 Existing MongoDB Collections: {collections if collections else '(None yet)'}")

    data_dir = os.path.join(backend_dir, "data")
    files_to_sync = ["users", "products", "orders"]

    print("\n📊 Current Data Summary:")
    print(f"{'Collection':<15} | {'JSON File Records':<20} | {'MongoDB Documents':<20}")
    print("-" * 65)

    local_data = {}
    for name in files_to_sync:
        json_file = os.path.join(data_dir, f"{name}.json")
        json_count = 0
        if os.path.exists(json_file):
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    content = json.load(f)
                    if isinstance(content, list):
                        json_count = len(content)
                        local_data[name] = content
            except Exception:
                json_count = 0
        
        col = db[name]
        try:
            mongo_count = await col.count_documents({})
        except Exception:
            mongo_count = 0

        print(f"{name:<15} | {json_count:<20} | {mongo_count:<20}")

    if sync_mode:
        print("\n🚀 Starting Data Migration to MongoDB...")
        for name, items in local_data.items():
            if not items:
                continue
            col = db[name]
            migrated = 0
            for item in items:
                # Use existing _id if present
                doc_id = item.get("_id") or item.get("id")
                if doc_id:
                    # Upsert to avoid duplicates
                    await col.update_one({"_id": str(doc_id)}, {"$set": item}, upsert=True)
                else:
                    await col.insert_one(item)
                migrated += 1
            print(f"  ✅ Synced {migrated} records into collection '{name}'")
        print("\n🎉 Migration completed successfully!")
    else:
        print("\n💡 Run with `--sync` to import/synchronize all local JSON records into MongoDB:")
        print("   python migrate_to_mongo.py --sync")

    client.close()
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(main())
