#!/usr/bin/env python3
"""
Rows.com Integration for Utility Schema Extractor

This module provides integration with Rows.com spreadsheet platform for
schema validation workflows. Much more practical than custom React UI.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
import aiohttp
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class RowsConfig:
    """Configuration for Rows.com integration."""
    api_key: str
    base_url: str = "https://api.rows.com"
    batch_size: int = 50  # Batch requests to minimize API usage
    rate_limit_delay: float = 1.0  # Seconds between requests


class RowsIntegration:
    """Integration with Rows.com for schema validation workflows."""

    def __init__(self, config: RowsConfig):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
        self.last_request_time = 0

    async def __aenter__(self):
        """Async context manager entry."""
        self.session = aiohttp.ClientSession(
            headers={
                'Authorization': f'Bearer {self.config.api_key}',
                'Content-Type': 'application/json'
            }
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()

    async def _rate_limit(self):
        """Implement rate limiting to avoid hitting usage limits."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time

        if time_since_last < self.config.rate_limit_delay:
            sleep_time = self.config.rate_limit_delay - time_since_last
            await asyncio.sleep(sleep_time)

        self.last_request_time = time.time()

    async def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
        """Make a rate-limited request to Rows API."""
        await self._rate_limit()

        url = f"{self.config.base_url}{endpoint}"

        try:
            async with self.session.request(method, url, json=data) as response:
                response.raise_for_status()
                return await response.json()
        except Exception as e:
            logger.error(f"Rows API request failed: {e}")
            raise

    async def create_spreadsheet(self, title: str, description: str = "") -> str:
        """Create a new spreadsheet for schema validation."""
        data = {
            "title": title,
            "description": description
        }

        response = await self._make_request("POST", "/v1/spreadsheets", data)
        spreadsheet_id = response.get("id")

        logger.info(f"Created Rows spreadsheet: {title} (ID: {spreadsheet_id})")
        return spreadsheet_id

    async def setup_schema_validation_sheets(self, spreadsheet_id: str) -> Dict[str, str]:
        """Setup sheets for schema validation workflow."""
        sheets = {
            "Properties": "Individual properties from all schemas",
            "Mappings": "Property mappings between local and global schemas",
            "Schemas": "Schema hierarchy and metadata",
            "Conflicts": "Mapping conflicts requiring manual resolution",
            "Approved": "Approved mappings and properties"
        }

        sheet_ids = {}

        for sheet_name, description in sheets.items():
            sheet_data = {
                "title": sheet_name,
                "description": description
            }

            response = await self._make_request(
                "POST",
                f"/v1/spreadsheets/{spreadsheet_id}/sheets",
                sheet_data
            )
            sheet_ids[sheet_name] = response.get("id")

            logger.info(f"Created sheet: {sheet_name}")

        return sheet_ids

    async def setup_properties_sheet_structure(self, spreadsheet_id: str, sheet_id: str):
        """Setup the Properties sheet with proper columns and formatting."""
        # Define column structure
        columns = [
            {"name": "Property ID", "type": "text"},
            {"name": "Property Name", "type": "text"},
            {"name": "Schema", "type": "text"},
            {"name": "Jurisdiction", "type": "text"},
            {"name": "Type", "type": "text"},
            {"name": "Description", "type": "text"},
            {"name": "Examples", "type": "text"},
            {"name": "Unit", "type": "text"},
            {"name": "Frequency", "type": "number"},
            {"name": "Confidence", "type": "number"},
            {"name": "Status", "type": "select", "options": ["pending", "approved", "rejected", "needs_review"]},
            {"name": "Mapped To", "type": "text"},
            {"name": "Notes", "type": "text"},
            {"name": "Last Modified", "type": "datetime"}
        ]

        # Setup columns
        for i, col in enumerate(columns):
            col_data = {
                "index": i,
                "title": col["name"],
                "type": col["type"]
            }

            if "options" in col:
                col_data["validation"] = {
                    "type": "list",
                    "source": col["options"]
                }

            await self._make_request(
                "PUT",
                f"/v1/spreadsheets/{spreadsheet_id}/sheets/{sheet_id}/columns/{i}",
                col_data
            )

        logger.info("Setup Properties sheet structure")

    async def setup_mappings_sheet_structure(self, spreadsheet_id: str, sheet_id: str):
        """Setup the Mappings sheet for validation workflow."""
        columns = [
            {"name": "Mapping ID", "type": "text"},
            {"name": "Local Property", "type": "text"},
            {"name": "Global Property", "type": "text"},
            {"name": "Local Schema", "type": "text"},
            {"name": "Jurisdiction", "type": "text"},
            {"name": "Confidence", "type": "number"},
            {"name": "Status", "type": "select", "options": ["pending", "approved", "rejected", "conflict"]},
            {"name": "Local Examples", "type": "text"},
            {"name": "Global Examples", "type": "text"},
            {"name": "Transformation", "type": "text"},
            {"name": "Conflict Reason", "type": "text"},
            {"name": "Reviewer", "type": "text"},
            {"name": "Review Date", "type": "datetime"},
            {"name": "Notes", "type": "text"}
        ]

        for i, col in enumerate(columns):
            col_data = {
                "index": i,
                "title": col["name"],
                "type": col["type"]
            }

            if "options" in col:
                col_data["validation"] = {
                    "type": "list",
                    "source": col["options"]
                }

            await self._make_request(
                "PUT",
                f"/v1/spreadsheets/{spreadsheet_id}/sheets/{sheet_id}/columns/{i}",
                col_data
            )

        logger.info("Setup Mappings sheet structure")

    async def batch_insert_properties(self, spreadsheet_id: str, sheet_id: str, properties: List[Dict]) -> bool:
        """Insert properties in batches to minimize API usage."""
        try:
            # Process in batches
            for i in range(0, len(properties), self.config.batch_size):
                batch = properties[i:i + self.config.batch_size]

                # Convert properties to row format
                rows_data = []
                for prop in batch:
                    row = [
                        prop.get("id", ""),
                        prop.get("name", ""),
                        prop.get("schema", ""),
                        prop.get("jurisdiction", ""),
                        prop.get("type", ""),
                        prop.get("description", ""),
                        json.dumps(prop.get("examples", [])),
                        prop.get("unit", ""),
                        prop.get("frequency", 0),
                        prop.get("confidence", 0.0),
                        prop.get("status", "pending"),
                        json.dumps(prop.get("mapped_to", [])),
                        prop.get("notes", ""),
                        datetime.now().isoformat()
                    ]
                    rows_data.append(row)

                # Insert batch
                insert_data = {
                    "values": rows_data,
                    "start_row": i,
                    "start_column": 0
                }

                await self._make_request(
                    "POST",
                    f"/v1/spreadsheets/{spreadsheet_id}/sheets/{sheet_id}/values",
                    insert_data
                )

                logger.info(f"Inserted batch {i//self.config.batch_size + 1} ({len(batch)} properties)")

            return True

        except Exception as e:
            logger.error(f"Failed to insert properties: {e}")
            return False

    async def batch_insert_mappings(self, spreadsheet_id: str, sheet_id: str, mappings: List[Dict]) -> bool:
        """Insert mappings in batches to minimize API usage."""
        try:
            for i in range(0, len(mappings), self.config.batch_size):
                batch = mappings[i:i + self.config.batch_size]

                rows_data = []
                for mapping in batch:
                    row = [
                        mapping.get("id", ""),
                        mapping.get("local_property", ""),
                        mapping.get("global_property", ""),
                        mapping.get("local_schema", ""),
                        mapping.get("jurisdiction", ""),
                        mapping.get("confidence", 0.0),
                        mapping.get("status", "pending"),
                        json.dumps(mapping.get("local_examples", [])),
                        json.dumps(mapping.get("global_examples", [])),
                        json.dumps(mapping.get("transformation_rules", {})),
                        mapping.get("conflict_reason", ""),
                        mapping.get("reviewer", ""),
                        mapping.get("review_date", ""),
                        mapping.get("notes", "")
                    ]
                    rows_data.append(row)

                insert_data = {
                    "values": rows_data,
                    "start_row": i,
                    "start_column": 0
                }

                await self._make_request(
                    "POST",
                    f"/v1/spreadsheets/{spreadsheet_id}/sheets/{sheet_id}/values",
                    insert_data
                )

                logger.info(f"Inserted mappings batch {i//self.config.batch_size + 1} ({len(batch)} mappings)")

            return True

        except Exception as e:
            logger.error(f"Failed to insert mappings: {e}")
            return False

    async def get_sheet_updates(self, spreadsheet_id: str, sheet_id: str, since: Optional[datetime] = None) -> List[Dict]:
        """Get updates from a sheet since a specific time."""
        try:
            params = {}
            if since:
                params["modified_since"] = since.isoformat()

            response = await self._make_request(
                "GET",
                f"/v1/spreadsheets/{spreadsheet_id}/sheets/{sheet_id}/values",
                params
            )

            return response.get("values", [])

        except Exception as e:
            logger.error(f"Failed to get sheet updates: {e}")
            return []

    async def sync_back_to_database(self, spreadsheet_id: str, mappings_sheet_id: str, supabase_client) -> int:
        """Sync approved mappings back to database."""
        try:
            # Get all approved mappings from Rows
            values = await self.get_sheet_updates(spreadsheet_id, mappings_sheet_id)

            approved_count = 0

            for row in values:
                if len(row) > 6 and row[6] == "approved":  # Status column
                    mapping_id = row[0]
                    reviewer = row[11] if len(row) > 11 else ""
                    review_date = row[12] if len(row) > 12 else datetime.now().isoformat()

                    # Update in Supabase
                    update_data = {
                        "status": "approved",
                        "reviewed_by": reviewer,
                        "last_modified": review_date
                    }

                    result = supabase_client.table("schema_mappings") \
                        .update(update_data) \
                        .eq("id", mapping_id) \
                        .execute()

                    if result.data:
                        approved_count += 1

            logger.info(f"Synced {approved_count} approved mappings back to database")
            return approved_count

        except Exception as e:
            logger.error(f"Failed to sync back to database: {e}")
            return 0

    async def create_validation_dashboard(self, properties: List[Dict], mappings: List[Dict]) -> str:
        """Create a complete validation dashboard in Rows."""
        try:
            # Create spreadsheet
            title = f"Schema Validation Dashboard - {datetime.now().strftime('%Y-%m-%d')}"
            spreadsheet_id = await self.create_spreadsheet(title,
                "Utility schema validation workflow - properties and mappings validation")

            # Setup sheets
            sheet_ids = await self.setup_schema_validation_sheets(spreadsheet_id)

            # Setup sheet structures
            await self.setup_properties_sheet_structure(spreadsheet_id, sheet_ids["Properties"])
            await self.setup_mappings_sheet_structure(spreadsheet_id, sheet_ids["Mappings"])

            # Insert data in batches
            if properties:
                await self.batch_insert_properties(spreadsheet_id, sheet_ids["Properties"], properties)

            if mappings:
                await self.batch_insert_mappings(spreadsheet_id, sheet_ids["Mappings"], mappings)

            # Return the spreadsheet URL
            spreadsheet_url = f"https://rows.com/spreadsheet/{spreadsheet_id}"
            logger.info(f"Created validation dashboard: {spreadsheet_url}")

            return spreadsheet_url

        except Exception as e:
            logger.error(f"Failed to create validation dashboard: {e}")
            raise


# Utility functions for data preparation
def prepare_properties_for_rows(supabase_data: List[Dict]) -> List[Dict]:
    """Convert Supabase property data to Rows format."""
    properties = []

    for item in supabase_data:
        prop = {
            "id": item.get("id", ""),
            "name": item.get("property_name", ""),
            "schema": item.get("schema_name", ""),
            "jurisdiction": item.get("jurisdiction", ""),
            "type": item.get("property_type", ""),
            "description": item.get("description", ""),
            "examples": item.get("examples", []),
            "unit": item.get("unit", ""),
            "frequency": item.get("frequency", 0),
            "confidence": item.get("confidence", 0.0),
            "status": item.get("status", "pending"),
            "mapped_to": item.get("mapped_to", []),
            "notes": ""
        }
        properties.append(prop)

    return properties


def prepare_mappings_for_rows(supabase_data: List[Dict]) -> List[Dict]:
    """Convert Supabase mapping data to Rows format."""
    mappings = []

    for item in supabase_data:
        mapping = {
            "id": item.get("id", ""),
            "local_property": item.get("local_property", ""),
            "global_property": item.get("global_property", ""),
            "local_schema": item.get("local_schema", ""),
            "jurisdiction": item.get("jurisdiction", ""),
            "confidence": item.get("confidence", 0.0),
            "status": item.get("status", "pending"),
            "local_examples": item.get("local_examples", []),
            "global_examples": item.get("global_examples", []),
            "transformation_rules": item.get("transformation_rules", {}),
            "conflict_reason": item.get("conflict_reason", ""),
            "reviewer": item.get("reviewed_by", ""),
            "review_date": item.get("last_modified", ""),
            "notes": ""
        }
        mappings.append(mapping)

    return mappings


# Example usage
async def main():
    """Example usage of Rows integration."""
    config = RowsConfig(
        api_key="rows-1RBNA9fC7CONGqBkt1QXlRPdh6CQUIfVH0y5Enp4s539",
        batch_size=25,  # Conservative batch size
        rate_limit_delay=1.5  # Conservative rate limiting
    )

    # Sample data
    sample_properties = [
        {
            "id": "prop_001",
            "name": "vertical_clearance",
            "schema": "Global Clearance Standards",
            "jurisdiction": "Global",
            "type": "measurement",
            "description": "Minimum vertical separation between utilities",
            "examples": ["36 inches", "91.44 cm"],
            "unit": "inches",
            "frequency": 47,
            "confidence": 0.95,
            "status": "pending",
            "mapped_to": ["vertical_clearance_minimum", "separacion_vertical"]
        }
    ]

    sample_mappings = [
        {
            "id": "map_001",
            "local_property": "separacion_vertical",
            "global_property": "vertical_clearance",
            "local_schema": "SF Standards",
            "jurisdiction": "San Francisco",
            "confidence": 0.87,
            "status": "pending",
            "local_examples": ["91.44 cm"],
            "global_examples": ["36 inches"],
            "transformation_rules": {"unit_conversion": {"factor": 0.393701}}
        }
    ]

    async with RowsIntegration(config) as rows:
        dashboard_url = await rows.create_validation_dashboard(
            sample_properties,
            sample_mappings
        )
        print(f"Validation dashboard created: {dashboard_url}")


if __name__ == "__main__":
    asyncio.run(main())