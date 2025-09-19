#!/usr/bin/env python3
"""
FastAPI Backend for Utility Schema Extractor

Provides API endpoints for:
- Document ingestion from raw data collection system
- Schema extraction and refinement
- Visualization data endpoints
- Management and monitoring
"""

import os
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn

from integration_bridge import IntegrationBridge, RawDataDocument, convert_raw_data_export

# Initialize FastAPI app
app = FastAPI(
    title="Utility Schema Extractor API",
    description="API for extracting and refining schemas from utility engineering specifications",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize integration bridge
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Warning: Supabase credentials not configured")

integration_bridge = IntegrationBridge(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None


# Pydantic models
class DocumentUploadResponse(BaseModel):
    document_id: str
    status: str
    message: str


class IngestionRequest(BaseModel):
    documents: List[Dict[str, Any]]
    batch_size: Optional[int] = 10


class IngestionResponse(BaseModel):
    processed: int
    failed: int
    document_ids: List[str]
    errors: List[str]


class StatusResponse(BaseModel):
    total_documents: int
    status_breakdown: Dict[str, int]
    jurisdiction_breakdown: Dict[str, int]
    date_range: Dict[str, str]


class SchemaHierarchy(BaseModel):
    global_schemas: Dict[str, Any]
    document_schemas: Dict[str, Any]
    mappings: Dict[str, Any]


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "supabase_configured": integration_bridge is not None
    }


# Document ingestion endpoints
@app.post("/api/ingest/raw-data", response_model=IngestionResponse)
async def ingest_raw_data(
    request: IngestionRequest,
    background_tasks: BackgroundTasks
):
    """
    Ingest documents from the raw data collection system.

    Accepts a list of documents in the raw data format and converts them
    to our schema extraction format.
    """
    if not integration_bridge:
        raise HTTPException(status_code=500, detail="Integration bridge not configured")

    try:
        # Convert request documents to RawDataDocument objects
        documents = []
        for doc_data in request.documents:
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

        # Set batch size if provided
        if request.batch_size:
            integration_bridge.batch_size = request.batch_size

        # Ingest documents
        results = await integration_bridge.ingest_raw_documents(documents)

        return IngestionResponse(**results)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


@app.post("/api/ingest/file")
async def ingest_from_file(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    Ingest documents from an uploaded raw data export file.
    """
    if not integration_bridge:
        raise HTTPException(status_code=500, detail="Integration bridge not configured")

    try:
        # Save uploaded file temporarily
        temp_path = f"/tmp/{file.filename}"
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Convert and ingest
        documents = convert_raw_data_export(temp_path)
        results = await integration_bridge.ingest_raw_documents(documents)

        # Clean up temp file
        os.remove(temp_path)

        return IngestionResponse(**results)

    except Exception as e:
        # Clean up temp file if it exists
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"File ingestion failed: {str(e)}")


# Status and monitoring endpoints
@app.get("/api/status", response_model=StatusResponse)
async def get_ingestion_status(
    days: int = 7
):
    """
    Get ingestion status for the last N days.
    """
    if not integration_bridge:
        raise HTTPException(status_code=500, detail="Integration bridge not configured")

    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        status = await integration_bridge.get_ingestion_status(start_date, end_date)

        if 'error' in status:
            raise HTTPException(status_code=500, detail=status['error'])

        return StatusResponse(**status)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")


# Schema visualization endpoints
@app.get("/api/schemas/hierarchy", response_model=SchemaHierarchy)
async def get_schema_hierarchy():
    """
    Get the complete schema hierarchy for visualization.
    """
    if not integration_bridge:
        raise HTTPException(status_code=500, detail="Integration bridge not configured")

    try:
        # This would need to be implemented in the schema mapper
        # For now, return a placeholder
        return SchemaHierarchy(
            global_schemas={},
            document_schemas={},
            mappings={}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get hierarchy: {str(e)}")


@app.get("/api/schemas/jurisdictions")
async def get_jurisdictions():
    """
    Get list of all jurisdictions with document counts.
    """
    if not integration_bridge:
        raise HTTPException(status_code=500, detail="Integration bridge not configured")

    try:
        # Query Supabase for jurisdiction data
        result = integration_bridge.supabase.table('documents').select('jurisdiction').execute()

        jurisdictions = {}
        for row in result.data:
            jurisdiction = row.get('jurisdiction', 'unknown')
            jurisdictions[jurisdiction] = jurisdictions.get(jurisdiction, 0) + 1

        return {
            "jurisdictions": jurisdictions,
            "total_count": len(result.data)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get jurisdictions: {str(e)}")


@app.get("/api/schemas/properties")
async def get_property_analysis():
    """
    Get analysis of extracted properties across all documents.
    """
    if not integration_bridge:
        raise HTTPException(status_code=500, detail="Integration bridge not configured")

    try:
        # Query document schemas
        result = integration_bridge.supabase.table('document_schemas').select('extracted_properties').execute()

        property_counts = {}
        for row in result.data:
            properties = row.get('extracted_properties', {})
            for prop_name in properties.keys():
                property_counts[prop_name] = property_counts.get(prop_name, 0) + 1

        # Sort by frequency
        sorted_properties = sorted(property_counts.items(), key=lambda x: x[1], reverse=True)

        return {
            "total_properties": len(property_counts),
            "property_frequencies": dict(sorted_properties[:50]),  # Top 50
            "total_documents": len(result.data)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get property analysis: {str(e)}")


# Export endpoints
@app.get("/api/export/mappings")
async def export_schema_mappings():
    """
    Export all schema mappings for analysis.
    """
    if not integration_bridge:
        raise HTTPException(status_code=500, detail="Integration bridge not configured")

    try:
        output_path = f"/tmp/schema_mappings_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        success = await integration_bridge.export_schema_mappings(output_path)

        if not success:
            raise HTTPException(status_code=500, detail="Export failed")

        # Read the file and return its contents
        with open(output_path, 'r') as f:
            export_data = json.load(f)

        # Clean up temp file
        os.remove(output_path)

        return export_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


# Development endpoints
@app.post("/api/dev/sample-data")
async def create_sample_data():
    """
    Create sample data for development and testing.
    """
    if not integration_bridge:
        raise HTTPException(status_code=500, detail="Integration bridge not configured")

    try:
        # Create sample documents
        sample_documents = [
            RawDataDocument(
                jurisdiction_id="nyc_001",
                jurisdiction_name="New York City",
                jurisdiction_level="city",
                document_title="NYC Utility Installation Standards",
                document_url="https://example.com/nyc_standards.pdf",
                document_type="pdf",
                file_path=None,
                content_hash="abc123",
                extraction_date=datetime.now(),
                quality_score=0.85,
                confidence_score=0.90,
                extracted_data={
                    "vertical_clearance_minimum": "36 inches",
                    "horizontal_clearance_gas": "12 inches",
                    "trench_backfill_material": "Type A aggregate",
                    "pavement_restoration_type": "concrete"
                },
                metadata={"source": "sample_data", "version": "1.0"}
            ),
            RawDataDocument(
                jurisdiction_id="ca_sf_001",
                jurisdiction_name="San Francisco",
                jurisdiction_level="city",
                document_title="SF Public Works Utility Standards",
                document_url="https://example.com/sf_standards.pdf",
                document_type="pdf",
                file_path=None,
                content_hash="def456",
                extraction_date=datetime.now(),
                quality_score=0.78,
                confidence_score=0.85,
                extracted_data={
                    "separacion_vertical": "91.44 cm",
                    "clearance_horizontal": "30.48 cm",
                    "material_relleno": "grava clasificada",
                    "tipo_pavimento": "asfalto"
                },
                metadata={"source": "sample_data", "version": "1.0", "language": "mixed"}
            )
        ]

        results = await integration_bridge.ingest_raw_documents(sample_documents)
        return {
            "message": "Sample data created successfully",
            "results": results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create sample data: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )