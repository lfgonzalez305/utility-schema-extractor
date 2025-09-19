#!/usr/bin/env python3
"""
Direct Supabase to Rows.com Sync Service

Simple, reliable sync service that eliminates frontend complexity.
Runs as a standalone service or cron job.
"""

import asyncio
import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
import sys
from supabase import create_client, Client
import aiohttp
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('sync.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class DirectSyncService:
    """Direct sync service between Supabase and Rows.com"""

    def __init__(self):
        # Configuration from environment
        self.supabase_url = os.getenv("SUPABASE_URL", "")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self.rows_api_key = os.getenv("ROWS_API_KEY", "rows-1RBNA9fC7CONGqBkt1QXlRPdh6CQUIfVH0y5Enp4s539")

        # Sync configuration
        self.batch_size = 50
        self.rate_limit_delay = 2.0  # Conservative rate limiting
        self.rows_base_url = "https://api.rows.com"

        # Initialize clients
        if self.supabase_url and self.supabase_key:
            self.supabase = create_client(self.supabase_url, self.supabase_key)
        else:
            logger.warning("Supabase credentials not configured")
            self.supabase = None

        self.session = None
        self.last_request_time = 0

    async def __aenter__(self):
        """Async context manager entry."""
        self.session = aiohttp.ClientSession(
            headers={
                'Authorization': f'Bearer {self.rows_api_key}',
                'Content-Type': 'application/json'
            }
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()

    async def _rate_limit(self):
        """Rate limiting to respect API limits."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time

        if time_since_last < self.rate_limit_delay:
            sleep_time = self.rate_limit_delay - time_since_last
            logger.info(f"Rate limiting: sleeping for {sleep_time:.1f}s")
            await asyncio.sleep(sleep_time)

        self.last_request_time = time.time()

    async def _make_rows_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
        """Make rate-limited request to Rows API."""
        await self._rate_limit()

        url = f"{self.rows_base_url}{endpoint}"

        try:
            async with self.session.request(method, url, json=data) as response:
                if response.status == 429:  # Rate limited
                    logger.warning("Rate limited by Rows API, waiting longer...")
                    await asyncio.sleep(5)
                    return await self._make_rows_request(method, endpoint, data)

                response.raise_for_status()
                return await response.json()

        except Exception as e:
            logger.error(f"Rows API request failed: {e}")
            raise

    def get_all_properties(self) -> List[Dict]:
        """Get all properties from Supabase in simple format."""
        if not self.supabase:
            return []

        try:
            # Get document schemas with properties
            result = self.supabase.table('document_schemas') \
                .select('*, documents(title, jurisdiction)') \
                .execute()

            properties = []
            for schema in result.data:
                doc = schema.get('documents', {})
                extracted_props = schema.get('extracted_properties', {})

                for prop_name, prop_value in extracted_props.items():
                    prop = {
                        'id': f"{schema['id']}_{prop_name}",
                        'property_name': prop_name,
                        'schema_name': doc.get('title', 'Unknown'),
                        'jurisdiction': doc.get('jurisdiction', 'Unknown'),
                        'value_example': str(prop_value)[:100] if prop_value else '',
                        'confidence': schema.get('confidence_score', 0.0),
                        'status': 'pending',
                        'notes': '',
                        'last_updated': datetime.now().isoformat()
                    }
                    properties.append(prop)

            logger.info(f"Retrieved {len(properties)} properties from Supabase")
            return properties

        except Exception as e:
            logger.error(f"Failed to get properties: {e}")
            return []

    def get_all_mappings(self) -> List[Dict]:
        """Get all mappings from Supabase in simple format."""
        if not self.supabase:
            return []

        try:
            result = self.supabase.table('schema_mappings') \
                .select('*, document_schemas(*, documents(*)), global_schemas(*)') \
                .execute()

            mappings = []
            for mapping in result.data:
                doc_schema = mapping.get('document_schemas', {})
                doc = doc_schema.get('documents', {})

                map_data = {
                    'id': mapping['id'],
                    'local_property': mapping['local_property'],
                    'global_property': mapping['global_property'],
                    'jurisdiction': doc.get('jurisdiction', 'Unknown'),
                    'schema_name': doc.get('title', 'Unknown'),
                    'confidence': mapping['confidence'],
                    'status': 'pending',
                    'reviewer': '',
                    'review_date': '',
                    'notes': '',
                    'last_updated': datetime.now().isoformat()
                }
                mappings.append(map_data)

            logger.info(f"Retrieved {len(mappings)} mappings from Supabase")
            return mappings

        except Exception as e:
            logger.error(f"Failed to get mappings: {e}")
            return []

    async def create_validation_spreadsheet(self) -> str:
        """Create a simple validation spreadsheet."""
        try:
            # Create spreadsheet
            spreadsheet_data = {
                "title": f"Schema Validation - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                "description": "Direct sync from utility schema extractor database"
            }

            response = await self._make_rows_request("POST", "/v1/spreadsheets", spreadsheet_data)
            spreadsheet_id = response.get("id")

            if not spreadsheet_id:
                raise Exception("Failed to create spreadsheet")

            logger.info(f"Created spreadsheet: {spreadsheet_id}")
            return spreadsheet_id

        except Exception as e:
            logger.error(f"Failed to create spreadsheet: {e}")
            raise

    async def setup_properties_sheet(self, spreadsheet_id: str) -> str:
        """Setup properties sheet with simple structure."""
        try:
            # Create properties sheet
            sheet_data = {
                "title": "Properties",
                "description": "All properties from schema extraction"
            }

            response = await self._make_rows_request(
                "POST",
                f"/v1/spreadsheets/{spreadsheet_id}/sheets",
                sheet_data
            )
            sheet_id = response.get("id")

            # Add header row
            headers = [
                "Property ID", "Property Name", "Schema", "Jurisdiction",
                "Example Value", "Confidence", "Status", "Notes", "Last Updated"
            ]

            header_data = {
                "values": [headers],
                "start_row": 0,
                "start_column": 0
            }

            await self._make_rows_request(
                "POST",
                f"/v1/spreadsheets/{spreadsheet_id}/sheets/{sheet_id}/values",
                header_data
            )

            logger.info(f"Setup properties sheet: {sheet_id}")
            return sheet_id

        except Exception as e:
            logger.error(f"Failed to setup properties sheet: {e}")
            raise

    async def setup_mappings_sheet(self, spreadsheet_id: str) -> str:
        """Setup mappings sheet with simple structure."""
        try:
            sheet_data = {
                "title": "Mappings",
                "description": "Property mappings for validation"
            }

            response = await self._make_rows_request(
                "POST",
                f"/v1/spreadsheets/{spreadsheet_id}/sheets",
                sheet_data
            )
            sheet_id = response.get("id")

            headers = [
                "Mapping ID", "Local Property", "Global Property", "Jurisdiction",
                "Schema", "Confidence", "Status", "Reviewer", "Review Date", "Notes", "Last Updated"
            ]

            header_data = {
                "values": [headers],
                "start_row": 0,
                "start_column": 0
            }

            await self._make_rows_request(
                "POST",
                f"/v1/spreadsheets/{spreadsheet_id}/sheets/{sheet_id}/values",
                header_data
            )

            logger.info(f"Setup mappings sheet: {sheet_id}")
            return sheet_id

        except Exception as e:
            logger.error(f"Failed to setup mappings sheet: {e}")
            raise

    async def sync_properties_to_rows(self, spreadsheet_id: str, sheet_id: str, properties: List[Dict]):
        """Sync properties to Rows sheet in batches."""
        try:
            # Convert properties to rows
            rows_data = []
            for prop in properties:
                row = [
                    prop.get('id', ''),
                    prop.get('property_name', ''),
                    prop.get('schema_name', ''),
                    prop.get('jurisdiction', ''),
                    prop.get('value_example', ''),
                    prop.get('confidence', 0.0),
                    prop.get('status', 'pending'),
                    prop.get('notes', ''),
                    prop.get('last_updated', '')
                ]
                rows_data.append(row)

            # Insert in batches
            for i in range(0, len(rows_data), self.batch_size):
                batch = rows_data[i:i + self.batch_size]

                batch_data = {
                    "values": batch,
                    "start_row": i + 1,  # Skip header row
                    "start_column": 0
                }

                await self._make_rows_request(
                    "POST",
                    f"/v1/spreadsheets/{spreadsheet_id}/sheets/{sheet_id}/values",
                    batch_data
                )

                logger.info(f"Synced properties batch {i//self.batch_size + 1} ({len(batch)} rows)")

            logger.info(f"Completed syncing {len(properties)} properties to Rows")

        except Exception as e:
            logger.error(f"Failed to sync properties: {e}")
            raise

    async def sync_mappings_to_rows(self, spreadsheet_id: str, sheet_id: str, mappings: List[Dict]):
        """Sync mappings to Rows sheet in batches."""
        try:
            rows_data = []
            for mapping in mappings:
                row = [
                    mapping.get('id', ''),
                    mapping.get('local_property', ''),
                    mapping.get('global_property', ''),
                    mapping.get('jurisdiction', ''),
                    mapping.get('schema_name', ''),
                    mapping.get('confidence', 0.0),
                    mapping.get('status', 'pending'),
                    mapping.get('reviewer', ''),
                    mapping.get('review_date', ''),
                    mapping.get('notes', ''),
                    mapping.get('last_updated', '')
                ]
                rows_data.append(row)

            # Insert in batches
            for i in range(0, len(rows_data), self.batch_size):
                batch = rows_data[i:i + self.batch_size]

                batch_data = {
                    "values": batch,
                    "start_row": i + 1,  # Skip header row
                    "start_column": 0
                }

                await self._make_rows_request(
                    "POST",
                    f"/v1/spreadsheets/{spreadsheet_id}/sheets/{sheet_id}/values",
                    batch_data
                )

                logger.info(f"Synced mappings batch {i//self.batch_size + 1} ({len(batch)} rows)")

            logger.info(f"Completed syncing {len(mappings)} mappings to Rows")

        except Exception as e:
            logger.error(f"Failed to sync mappings: {e}")
            raise

    async def run_full_sync(self) -> str:
        """Run complete sync from Supabase to Rows.com"""
        logger.info("Starting full sync from Supabase to Rows.com")

        try:
            # Get data from Supabase
            properties = self.get_all_properties()
            mappings = self.get_all_mappings()

            if not properties and not mappings:
                logger.warning("No data found in Supabase")
                return ""

            # Create spreadsheet
            spreadsheet_id = await self.create_validation_spreadsheet()

            # Setup sheets and sync data
            if properties:
                properties_sheet_id = await self.setup_properties_sheet(spreadsheet_id)
                await self.sync_properties_to_rows(spreadsheet_id, properties_sheet_id, properties)

            if mappings:
                mappings_sheet_id = await self.setup_mappings_sheet(spreadsheet_id)
                await self.sync_mappings_to_rows(spreadsheet_id, mappings_sheet_id, mappings)

            spreadsheet_url = f"https://rows.com/spreadsheet/{spreadsheet_id}"
            logger.info(f"Full sync completed successfully: {spreadsheet_url}")

            return spreadsheet_url

        except Exception as e:
            logger.error(f"Full sync failed: {e}")
            raise


async def main():
    """Main entry point for sync service."""
    logger.info("Direct Sync Service Starting...")

    try:
        async with DirectSyncService() as sync_service:
            spreadsheet_url = await sync_service.run_full_sync()

            if spreadsheet_url:
                print(f"\n✅ Sync completed successfully!")
                print(f"📊 Validation Spreadsheet: {spreadsheet_url}")
                print(f"🎯 Users can now validate schemas directly in Rows.com")
            else:
                print("❌ Sync failed - check logs for details")

    except Exception as e:
        logger.error(f"Sync service failed: {e}")
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(main())