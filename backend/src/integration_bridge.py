#!/usr/bin/env python3
"""
Integration Bridge for ROW Data Collection → Schema Extraction Pipeline

This module provides the bridge between the raw data collection system
and the schema extraction system, converting schema-ready exports
into the format expected by the Supabase-based schema extraction database.
"""

import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from pathlib import Path
import asyncio
import aiofiles
from supabase import create_client, Client
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class RawDataDocument:
    """Represents a document from the raw data collection system."""
    jurisdiction_id: str
    jurisdiction_name: str
    jurisdiction_level: str  # city, county, state, federal, etc.
    document_title: str
    document_url: str
    document_type: str
    file_path: Optional[str]
    content_hash: str
    extraction_date: datetime
    quality_score: float
    confidence_score: float
    extracted_data: Dict[str, Any]
    metadata: Dict[str, Any]


@dataclass
class ProcessedData:
    """Processed data ready for schema extraction."""
    document_id: str
    properties: Dict[str, Any]
    extraction_metadata: Dict[str, Any]
    quality_metrics: Dict[str, float]


class IntegrationBridge:
    """Bridge between raw data collection and schema extraction systems."""

    def __init__(self, supabase_url: str, supabase_key: str):
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.batch_size = 10

    async def ingest_raw_documents(self, documents: List[RawDataDocument]) -> Dict[str, Any]:
        """
        Ingest documents from the raw data collection system.

        Args:
            documents: List of RawDataDocument objects

        Returns:
            Dictionary with ingestion results and statistics
        """
        results = {
            'processed': 0,
            'failed': 0,
            'document_ids': [],
            'errors': []
        }

        logger.info(f"Starting ingestion of {len(documents)} documents")

        # Process documents in batches
        for i in range(0, len(documents), self.batch_size):
            batch = documents[i:i + self.batch_size]
            batch_results = await self._process_document_batch(batch)

            results['processed'] += batch_results['processed']
            results['failed'] += batch_results['failed']
            results['document_ids'].extend(batch_results['document_ids'])
            results['errors'].extend(batch_results['errors'])

            # Small delay between batches to avoid overwhelming the database
            await asyncio.sleep(0.1)

        logger.info(f"Ingestion complete: {results['processed']} processed, {results['failed']} failed")
        return results

    async def _process_document_batch(self, documents: List[RawDataDocument]) -> Dict[str, Any]:
        """Process a batch of documents."""
        batch_results = {
            'processed': 0,
            'failed': 0,
            'document_ids': [],
            'errors': []
        }

        for doc in documents:
            try:
                document_id = await self._store_document(doc)
                if document_id:
                    batch_results['document_ids'].append(document_id)
                    batch_results['processed'] += 1

                    # Trigger schema extraction job
                    await self._create_extraction_job(document_id)
                else:
                    batch_results['failed'] += 1
                    batch_results['errors'].append(f"Failed to store document: {doc.document_title}")

            except Exception as e:
                batch_results['failed'] += 1
                batch_results['errors'].append(f"Error processing {doc.document_title}: {str(e)}")
                logger.error(f"Error processing document {doc.document_title}: {e}")

        return batch_results

    async def _store_document(self, doc: RawDataDocument) -> Optional[str]:
        """Store a document in the Supabase database."""
        try:
            # Prepare document data for insertion
            document_data = {
                'title': doc.document_title,
                'description': f"Document from {doc.jurisdiction_name} ({doc.jurisdiction_level})",
                'jurisdiction': f"{doc.jurisdiction_name}:{doc.jurisdiction_level}",
                'document_type': doc.document_type,
                'file_path': doc.file_path,
                'mime_type': self._determine_mime_type(doc.document_type),
                'status': 'uploaded',
                'metadata': {
                    'jurisdiction_id': doc.jurisdiction_id,
                    'jurisdiction_level': doc.jurisdiction_level,
                    'document_url': doc.document_url,
                    'content_hash': doc.content_hash,
                    'extraction_date': doc.extraction_date.isoformat(),
                    'quality_score': doc.quality_score,
                    'confidence_score': doc.confidence_score,
                    'raw_metadata': doc.metadata
                }
            }

            # Insert document
            result = self.supabase.table('documents').insert(document_data).execute()

            if result.data:
                document_id = result.data[0]['id']

                # Store the extracted schema data
                await self._store_document_schema(document_id, doc)

                return document_id
            else:
                logger.error(f"Failed to insert document: {doc.document_title}")
                return None

        except Exception as e:
            logger.error(f"Error storing document {doc.document_title}: {e}")
            return None

    async def _store_document_schema(self, document_id: str, doc: RawDataDocument):
        """Store the extracted schema data for a document."""
        try:
            # Convert extracted data to schema format
            schema_data = self._convert_to_schema_format(doc.extracted_data)

            schema_record = {
                'document_id': document_id,
                'schema_data': schema_data,
                'extraction_method': 'raw_data_collection',
                'confidence_score': doc.confidence_score,
                'extracted_properties': doc.extracted_data
            }

            result = self.supabase.table('document_schemas').insert(schema_record).execute()

            if not result.data:
                logger.error(f"Failed to insert schema for document: {document_id}")

        except Exception as e:
            logger.error(f"Error storing schema for document {document_id}: {e}")

    async def _create_extraction_job(self, document_id: str):
        """Create a processing job for schema extraction and alignment."""
        try:
            job_data = {
                'document_id': document_id,
                'job_type': 'extract_schema',
                'status': 'pending'
            }

            result = self.supabase.table('processing_jobs').insert(job_data).execute()

            if not result.data:
                logger.error(f"Failed to create extraction job for document: {document_id}")

        except Exception as e:
            logger.error(f"Error creating extraction job for document {document_id}: {e}")

    def _convert_to_schema_format(self, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert extracted data to our schema format."""
        schema = {
            'type': 'object',
            'properties': {},
            'metadata': {
                'extraction_source': 'raw_data_collection',
                'extraction_timestamp': datetime.now().isoformat()
            }
        }

        for key, value in extracted_data.items():
            property_schema = self._infer_property_schema(key, value)
            schema['properties'][key] = property_schema

        return schema

    def _infer_property_schema(self, key: str, value: Any) -> Dict[str, Any]:
        """Infer schema for a property based on its value."""
        if isinstance(value, str):
            return {
                'type': 'string',
                'example': value,
                'property_name': key
            }
        elif isinstance(value, (int, float)):
            return {
                'type': 'number',
                'example': value,
                'property_name': key,
                'unit': self._extract_unit_from_key(key)
            }
        elif isinstance(value, bool):
            return {
                'type': 'boolean',
                'example': value,
                'property_name': key
            }
        elif isinstance(value, list):
            return {
                'type': 'array',
                'items': self._infer_property_schema(f"{key}_item", value[0]) if value else {'type': 'string'},
                'example': value,
                'property_name': key
            }
        elif isinstance(value, dict):
            return {
                'type': 'object',
                'properties': {k: self._infer_property_schema(k, v) for k, v in value.items()},
                'property_name': key
            }
        else:
            return {
                'type': 'string',
                'example': str(value),
                'property_name': key
            }

    def _extract_unit_from_key(self, key: str) -> Optional[str]:
        """Extract unit information from property key names."""
        key_lower = key.lower()

        # Common unit patterns
        unit_patterns = {
            'feet': ['ft', 'foot', 'feet'],
            'inches': ['in', 'inch', 'inches'],
            'meters': ['m', 'meter', 'meters', 'metre', 'metres'],
            'centimeters': ['cm', 'centimeter', 'centimeters'],
            'millimeters': ['mm', 'millimeter', 'millimeters'],
            'yards': ['yd', 'yard', 'yards'],
            'miles': ['mi', 'mile', 'miles'],
            'kilometers': ['km', 'kilometer', 'kilometers'],
            'degrees': ['deg', 'degree', 'degrees'],
            'percent': ['pct', 'percent', 'percentage', '%'],
            'pounds': ['lb', 'lbs', 'pound', 'pounds'],
            'kilograms': ['kg', 'kilogram', 'kilograms'],
            'psi': ['psi', 'pressure'],
            'mph': ['mph', 'speed'],
            'kph': ['kph', 'kmh']
        }

        for unit, patterns in unit_patterns.items():
            if any(pattern in key_lower for pattern in patterns):
                return unit

        return None

    def _determine_mime_type(self, document_type: str) -> str:
        """Determine MIME type from document type."""
        mime_types = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'html': 'text/html',
            'txt': 'text/plain',
            'xml': 'application/xml'
        }

        return mime_types.get(document_type.lower(), 'application/octet-stream')

    async def get_ingestion_status(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get ingestion status for a date range."""
        try:
            # Query documents ingested in the date range
            result = self.supabase.table('documents').select('*').gte('created_at', start_date.isoformat()).lte('created_at', end_date.isoformat()).execute()

            documents = result.data

            # Count by status
            status_counts = {}
            jurisdiction_counts = {}

            for doc in documents:
                status = doc.get('status', 'unknown')
                jurisdiction = doc.get('jurisdiction', 'unknown')

                status_counts[status] = status_counts.get(status, 0) + 1
                jurisdiction_counts[jurisdiction] = jurisdiction_counts.get(jurisdiction, 0) + 1

            return {
                'total_documents': len(documents),
                'status_breakdown': status_counts,
                'jurisdiction_breakdown': jurisdiction_counts,
                'date_range': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                }
            }

        except Exception as e:
            logger.error(f"Error getting ingestion status: {e}")
            return {'error': str(e)}

    async def export_schema_mappings(self, output_path: str) -> bool:
        """Export all schema mappings for analysis."""
        try:
            # Get all schema mappings with related data
            result = self.supabase.table('schema_mappings').select(
                '*, document_schemas(*, documents(*)), global_schemas(*)'
            ).execute()

            mappings_data = result.data

            # Prepare export data
            export_data = {
                'export_timestamp': datetime.now().isoformat(),
                'total_mappings': len(mappings_data),
                'mappings': mappings_data
            }

            # Write to file
            async with aiofiles.open(output_path, 'w') as f:
                await f.write(json.dumps(export_data, indent=2, default=str))

            logger.info(f"Exported {len(mappings_data)} schema mappings to {output_path}")
            return True

        except Exception as e:
            logger.error(f"Error exporting schema mappings: {e}")
            return False


# Utility functions for format conversion
def convert_raw_data_export(export_file_path: str) -> List[RawDataDocument]:
    """Convert a raw data export file to RawDataDocument objects."""
    documents = []

    try:
        with open(export_file_path, 'r') as f:
            export_data = json.load(f)

        for doc_data in export_data.get('documents', []):
            doc = RawDataDocument(
                jurisdiction_id=doc_data.get('jurisdiction_id', ''),
                jurisdiction_name=doc_data.get('jurisdiction_name', ''),
                jurisdiction_level=doc_data.get('jurisdiction_level', ''),
                document_title=doc_data.get('title', ''),
                document_url=doc_data.get('url', ''),
                document_type=doc_data.get('type', ''),
                file_path=doc_data.get('file_path'),
                content_hash=doc_data.get('content_hash', ''),
                extraction_date=datetime.fromisoformat(doc_data.get('extraction_date', datetime.now().isoformat())),
                quality_score=doc_data.get('quality_score', 0.0),
                confidence_score=doc_data.get('confidence_score', 0.0),
                extracted_data=doc_data.get('extracted_data', {}),
                metadata=doc_data.get('metadata', {})
            )
            documents.append(doc)

        return documents

    except Exception as e:
        logger.error(f"Error converting raw data export: {e}")
        return []


# Example usage
async def main():
    """Example usage of the integration bridge."""
    # Initialize the bridge
    bridge = IntegrationBridge(
        supabase_url="your_supabase_url",
        supabase_key="your_supabase_key"
    )

    # Convert raw data export
    documents = convert_raw_data_export("path/to/raw_data_export.json")

    # Ingest documents
    results = await bridge.ingest_raw_documents(documents)
    print(f"Ingestion results: {results}")

    # Check status
    start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = datetime.now()
    status = await bridge.get_ingestion_status(start_date, end_date)
    print(f"Ingestion status: {status}")


if __name__ == "__main__":
    asyncio.run(main())