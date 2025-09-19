# Utility Schema Extractor

An iterative system for extracting and refining structured schemas from utility engineering specifications across global jurisdictions.

## Overview

This system processes right-of-way utility engineering specifications from various jurisdictions worldwide, extracting structured data and building unified schemas while preserving jurisdiction-specific variations.

## Architecture

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Backend**: FastAPI with Python for ML/AI processing
- **Database**: Supabase with PostgreSQL and vector storage
- **Hosting**: Vercel for frontend, Supabase for backend services

## Key Features

- Document parsing and data extraction
- Iterative schema generation and refinement
- Semantic alignment of properties across jurisdictions
- Schema inheritance and polymorphism
- Interactive visualization of schema hierarchies
- Unit conversion and normalization
- Mapping preservation between local and global schemas

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- Supabase CLI
- Vercel CLI (optional, for deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/lfgonzalez305/utility-schema-extractor.git
cd utility-schema-extractor
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
cd backend
pip install -r requirements.txt
```

4. Setup Supabase:
```bash
supabase init
supabase start
```

### Development

Run the frontend:
```bash
npm run dev
```

Run the backend:
```bash
npm run backend
```

## Project Structure

```
├── src/                    # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   └── lib/              # Utilities and config
├── backend/              # FastAPI backend
│   ├── src/              # Python source code
│   └── tests/            # Backend tests
├── database/             # Supabase config
│   ├── migrations/       # Database migrations
│   └── seed/            # Seed data
├── docs/                # Documentation
└── examples/            # Sample specifications
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details