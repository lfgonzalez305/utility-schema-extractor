-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table for storing uploaded specification files
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    jurisdiction TEXT NOT NULL,
    document_type TEXT,
    file_path TEXT,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'error')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document schemas extracted from individual documents
CREATE TABLE document_schemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    schema_data JSONB NOT NULL,
    extraction_method TEXT,
    confidence_score DECIMAL(3,2),
    extracted_properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Global unified schemas
CREATE TABLE global_schemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    parent_schema_id UUID REFERENCES global_schemas(id),
    schema_definition JSONB NOT NULL,
    properties JSONB DEFAULT '{}'::jsonb,
    inheritance_chain TEXT[],
    source_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mappings between document schemas and global schemas
CREATE TABLE schema_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_schema_id UUID REFERENCES document_schemas(id) ON DELETE CASCADE,
    global_schema_id UUID REFERENCES global_schemas(id) ON DELETE CASCADE,
    local_property TEXT NOT NULL,
    global_property TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    transformation_rules JSONB DEFAULT '{}'::jsonb,
    mapping_method TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vector embeddings for semantic search
CREATE TABLE document_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    content_chunk TEXT NOT NULL,
    embedding vector(1536), -- OpenAI ada-002 dimension
    chunk_index INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property embeddings for semantic alignment
CREATE TABLE property_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_schema_id UUID REFERENCES document_schemas(id) ON DELETE CASCADE,
    property_name TEXT NOT NULL,
    property_description TEXT,
    embedding vector(1536),
    property_value_examples JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processing jobs queue
CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN ('extract_schema', 'align_schemas', 'generate_embeddings')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    result JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_documents_jurisdiction ON documents(jurisdiction);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_document_schemas_document_id ON document_schemas(document_id);
CREATE INDEX idx_schema_mappings_document_schema_id ON schema_mappings(document_schema_id);
CREATE INDEX idx_schema_mappings_global_schema_id ON schema_mappings(global_schema_id);
CREATE INDEX idx_global_schemas_parent_schema_id ON global_schemas(parent_schema_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);

-- Vector similarity search indexes
CREATE INDEX idx_document_embeddings_embedding ON document_embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_property_embeddings_embedding ON property_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_schemas_updated_at BEFORE UPDATE ON document_schemas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_schemas_updated_at BEFORE UPDATE ON global_schemas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schema_mappings_updated_at BEFORE UPDATE ON schema_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (adjust based on auth requirements)
CREATE POLICY "Allow all operations" ON documents FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON document_schemas FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON global_schemas FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON schema_mappings FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON document_embeddings FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON property_embeddings FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON processing_jobs FOR ALL USING (true);