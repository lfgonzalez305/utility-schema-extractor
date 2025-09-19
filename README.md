# Utility Schema Extractor

Simple, reliable system for extracting and validating schemas from utility engineering specifications across global jurisdictions.

## Overview

This system processes right-of-way utility engineering specifications from various jurisdictions worldwide, extracting structured data and building unified schemas. **Focus on simplicity**: direct database sync to Rows.com for validation workflows.

## Architecture (Simplified)

- **Database**: Supabase with PostgreSQL and vector storage
- **Sync Service**: Python script for direct database to Rows.com sync
- **Interface**: Rows.com spreadsheets (Python + Postgres integration)
- **Data Pipeline**: Raw documents → Schema extraction → Rows.com validation

## Key Features

- Direct sync from database to Rows.com (no frontend complexity)
- Spreadsheet-based validation workflows
- Batch processing with rate limiting
- Property and mapping validation
- Real-time collaboration in Rows.com
- Python integration for custom validation logic

## Getting Started

### Prerequisites

- Python 3.9+
- Supabase account
- Rows.com API key

### Quick Setup

1. Clone the repository:
```bash
git clone https://github.com/lfgonzalez305/utility-schema-extractor.git
cd utility-schema-extractor
```

2. Install minimal dependencies:
```bash
pip install -r backend/requirements-simple.txt
```

3. Configure environment variables:
```bash
cp .env.simple .env
# Edit .env with your credentials
```

4. Run direct sync:
```bash
python run_sync.py
```

That's it! You'll get a Rows.com spreadsheet URL for validation.

## Simplified Workflow

1. **Data Ingestion**: Other agent scrapes documents and populates Supabase
2. **Direct Sync**: Run `python run_sync.py` to create Rows.com spreadsheet
3. **Validation**: Work entirely in Rows.com to validate properties and mappings
4. **Analysis**: Use Rows.com's Python integration for advanced validation logic

## Environment Variables

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ROWS_API_KEY=your_rows_api_key
```

## Project Structure (Simplified)

```
├── backend/src/           # Core sync and processing logic
│   ├── direct_sync.py     # Main sync service
│   ├── integration_bridge.py  # Data ingestion from other agent
│   └── schema_mapper.py   # Schema mapping logic
├── run_sync.py           # Simple runner script
├── supabase/             # Database schema and migrations
└── .env.simple          # Configuration template
```

## Why This Approach?

- **No frontend complexity** - Eliminates React/UI library issues
- **Familiar interface** - Everyone knows spreadsheets
- **Python integration** - Custom validation scripts in Rows.com
- **Direct sync** - No intermediate UI layer to break
- **Collaborative** - Multiple reviewers can work simultaneously
- **Reliable** - Simple Python scripts are much more stable

## Usage

```bash
# Run sync and get validation spreadsheet
python run_sync.py

# Output:
# ✅ SUCCESS!
# 📊 Validation Spreadsheet: https://rows.com/spreadsheet/abc123
```

## License

MIT License - see LICENSE file for details