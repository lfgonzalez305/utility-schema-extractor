"""
Schema mapping system that maintains clear relationships between local and global schemas.
"""

from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, field
from datetime import datetime
import uuid


@dataclass
class SchemaMapping:
    """Maps a local schema property to one or more global schema properties."""
    local_property: str
    global_properties: List[str]
    confidence: float  # 0.0 to 1.0
    transformation_rules: Dict[str, Any] = field(default_factory=dict)
    notes: str = ""


@dataclass
class DocumentSchema:
    """Represents a schema extracted from a single document."""
    schema_id: str
    jurisdiction: str
    document_title: str
    document_source: str
    extraction_date: datetime
    properties: Dict[str, Any]  # Raw properties extracted from document
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class GlobalSchema:
    """Represents a refined global schema that consolidates multiple local schemas."""
    schema_id: str
    name: str
    version: str
    properties: Dict[str, Any]
    parent_schema_id: Optional[str] = None  # For inheritance
    source_schemas: Set[str] = field(default_factory=set)  # Local schema IDs that contributed
    created_date: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)


class SchemaMapper:
    """Manages mappings between local and global schemas."""

    def __init__(self):
        self.document_schemas: Dict[str, DocumentSchema] = {}
        self.global_schemas: Dict[str, GlobalSchema] = {}
        self.mappings: Dict[str, List[SchemaMapping]] = {}  # doc_schema_id -> mappings

    def register_document_schema(self, schema: DocumentSchema) -> str:
        """Register a new document schema and return its ID."""
        self.document_schemas[schema.schema_id] = schema
        self.mappings[schema.schema_id] = []
        return schema.schema_id

    def create_global_schema(self, name: str, properties: Dict[str, Any],
                           parent_id: Optional[str] = None) -> str:
        """Create a new global schema."""
        schema_id = f"global_{uuid.uuid4().hex[:8]}"
        global_schema = GlobalSchema(
            schema_id=schema_id,
            name=name,
            version="1.0.0",
            properties=properties,
            parent_schema_id=parent_id
        )
        self.global_schemas[schema_id] = global_schema
        return schema_id

    def add_mapping(self, doc_schema_id: str, mapping: SchemaMapping):
        """Add a mapping from local to global schema property."""
        if doc_schema_id not in self.mappings:
            self.mappings[doc_schema_id] = []
        self.mappings[doc_schema_id].append(mapping)

        # Update global schema source tracking
        for global_prop in mapping.global_properties:
            global_schema_id = self._find_global_schema_by_property(global_prop)
            if global_schema_id:
                self.global_schemas[global_schema_id].source_schemas.add(doc_schema_id)

    def get_document_values_mapped_to_global(self, doc_schema_id: str) -> Dict[str, Any]:
        """Get document values mapped to global schema properties."""
        if doc_schema_id not in self.document_schemas:
            return {}

        doc_schema = self.document_schemas[doc_schema_id]
        mappings = self.mappings.get(doc_schema_id, [])

        result = {}
        for mapping in mappings:
            local_value = doc_schema.properties.get(mapping.local_property)
            if local_value is not None:
                # Apply transformation rules if any
                transformed_value = self._apply_transformations(
                    local_value, mapping.transformation_rules
                )

                for global_prop in mapping.global_properties:
                    result[global_prop] = {
                        'value': transformed_value,
                        'original_value': local_value,
                        'original_property': mapping.local_property,
                        'confidence': mapping.confidence,
                        'source_document': doc_schema.document_title,
                        'jurisdiction': doc_schema.jurisdiction
                    }

        return result

    def get_schema_hierarchy(self) -> Dict[str, Any]:
        """Get the full schema hierarchy for visualization."""
        hierarchy = {
            'global_schemas': {},
            'document_schemas': {},
            'mappings': {}
        }

        # Build global schema tree
        for schema_id, schema in self.global_schemas.items():
            hierarchy['global_schemas'][schema_id] = {
                'name': schema.name,
                'version': schema.version,
                'parent': schema.parent_schema_id,
                'properties': list(schema.properties.keys()),
                'source_count': len(schema.source_schemas),
                'created': schema.created_date.isoformat()
            }

        # Add document schemas
        for schema_id, schema in self.document_schemas.items():
            hierarchy['document_schemas'][schema_id] = {
                'jurisdiction': schema.jurisdiction,
                'document_title': schema.document_title,
                'properties': list(schema.properties.keys()),
                'extraction_date': schema.extraction_date.isoformat()
            }

        # Add mapping relationships
        for doc_id, mappings in self.mappings.items():
            hierarchy['mappings'][doc_id] = [
                {
                    'local_property': m.local_property,
                    'global_properties': m.global_properties,
                    'confidence': m.confidence
                }
                for m in mappings
            ]

        return hierarchy

    def _find_global_schema_by_property(self, property_name: str) -> Optional[str]:
        """Find global schema that contains a specific property."""
        for schema_id, schema in self.global_schemas.items():
            if property_name in schema.properties:
                return schema_id
        return None

    def _apply_transformations(self, value: Any, rules: Dict[str, Any]) -> Any:
        """Apply transformation rules to convert local values to global format."""
        if not rules:
            return value

        # Unit conversion
        if 'unit_conversion' in rules:
            conversion = rules['unit_conversion']
            if isinstance(value, (int, float)):
                factor = conversion.get('factor', 1.0)
                offset = conversion.get('offset', 0.0)
                return value * factor + offset

        # String normalization
        if 'string_normalization' in rules:
            if isinstance(value, str):
                if rules['string_normalization'].get('lowercase'):
                    value = value.lower()
                if rules['string_normalization'].get('strip'):
                    value = value.strip()

        return value