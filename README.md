# RetailOS

**AI Operating System for Small Retail Businesses**

Eliminate manual inventory management for kirana stores, grocery shops, hardware stores, and local merchants.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React, TypeScript, Tailwind, React Query, ShadCN |
| Backend | Django, Django REST Framework, PostgreSQL, Redis, Celery |
| AI | LangGraph, LangChain, Vision, Whisper, OCR |
| Deploy | Vercel (FE), Render (BE), Supabase (DB + Storage) |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker (optional, for Postgres + Redis)

### 1. Infrastructure

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
python manage.py makemigrations core inventory credit analytics agents
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

API: http://localhost:8000/api/v1/

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App: http://localhost:5173

## Project Structure

```
retailos/
├── docs/DESIGN.md          # Full software design document
├── backend/                # FastAPI + LangGraph
│   └── app/
│       ├── api/v1/         # REST endpoints
│       ├── agents/         # LangGraph AI pipelines
│       ├── models/         # SQLAlchemy models
│       ├── services/       # Business logic
│       └── workers/        # Celery background jobs
├── frontend/               # React dashboard
│   └── src/
│       ├── pages/          # Route pages
│       ├── components/     # UI components
│       └── features/       # Feature modules
└── docker-compose.yml
```

## Core Features (Roadmap)

- [x] Project scaffold
- [ ] Photo inventory (vision + OCR)
- [ ] Voice inventory (Whisper + intent extraction)
- [ ] Invoice parser (PDF/image)
- [ ] Customer credit ledger
- [ ] Sales analytics + AI insights
- [ ] Demand forecasting
- [ ] Smart search (SQL agent)

See [docs/DESIGN.md](docs/DESIGN.md) for full architecture.
