#!/usr/bin/env python3
"""
Simple runner for direct sync service.
No frontend, no complexity - just sync data to Rows.com
"""

import os
import sys
import asyncio
from pathlib import Path

# Add backend src to path
backend_src = Path(__file__).parent / "backend" / "src"
sys.path.insert(0, str(backend_src))

from direct_sync import DirectSyncService


async def run_sync():
    """Run the direct sync service."""
    print("🚀 Utility Schema Extractor - Direct Sync to Rows.com")
    print("=" * 60)

    # Check environment variables
    required_env = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "ROWS_API_KEY"
    ]

    missing_env = []
    for env_var in required_env:
        if not os.getenv(env_var):
            missing_env.append(env_var)

    if missing_env:
        print("❌ Missing required environment variables:")
        for var in missing_env:
            print(f"   - {var}")
        print("\nPlease set these environment variables and try again.")
        return

    print("✅ Environment variables configured")
    print("🔄 Starting sync process...")

    try:
        async with DirectSyncService() as sync_service:
            spreadsheet_url = await sync_service.run_full_sync()

            if spreadsheet_url:
                print("\n" + "=" * 60)
                print("✅ SUCCESS!")
                print(f"📊 Validation Spreadsheet: {spreadsheet_url}")
                print("\n🎯 Next Steps:")
                print("1. Open the spreadsheet URL above")
                print("2. Review and validate properties and mappings")
                print("3. Update status columns (pending → approved/rejected)")
                print("4. Add notes and reviewer information")
                print("5. Use Rows.com's Python integration for advanced validation")
                print("=" * 60)
            else:
                print("❌ Sync failed - check sync.log for details")

    except Exception as e:
        print(f"❌ Error: {e}")
        print("Check sync.log for detailed error information")


if __name__ == "__main__":
    asyncio.run(run_sync())