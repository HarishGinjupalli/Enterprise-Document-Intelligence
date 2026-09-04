# Project Progress — Enterprise Document Intelligence

> **For AI agents:** Inspect this file before continuing. Do NOT recreate completed work.

## Current Status: Phases 1–16 Foundation Complete

Last updated: 2026-09-04

## Recently Completed
- Metrics summary API and real Metrics page values
- Paginated document and conversation responses
- Conversation history sidebar and switching
- Access-controlled PDF preview on document details

---

## Completed Phases

### Phase 1 — Project Foundation ✅
- Monorepo structure: `frontend/`, `backend/`, `database/`, `evaluation/`, `docs/`, `scripts/`, `infrastructure/`
- Backend: Express, config, logging, error handling, health/ready endpoints, graceful shutdown
- Frontend: React + Vite, routing, layout, loading/error states
- Docker Compose for MySQL + backend + frontend
- `.gitignore`, `.env.example`, root `package.json`

### Phase 2 — Database Design ✅
- Full MySQL schema in `database/migrations/001_initial_schema.sql`
- Tables: users, documents, document_permissions, document_versions, document_metadata, document_chunks, conversations, messages, citations, queries, retrieval_results, evaluations, feedback, usage_metrics, system_logs
- Foreign keys, indexes, FULLTEXT indexes on chunks
- Migration runner: `backend/scripts/migrate.js`

### Phase 3 — Authentication ✅
- Register, login, logout, GET /auth/me
- JWT middleware, role-based authorization (ADMIN, USER)
- bcrypt password hashing, express-validator input validation

### Phase 4 — PDF Ingestion ✅
- POST /documents/upload with multer
- Background job queue (in-process)
- Pipeline: PDF → pdf-parse → chunking → embedding → vector index → MySQL
- Document states: UPLOADED, PROCESSING, INDEXED, FAILED
- Frontend: upload, progress, list, status polling, delete

### Phase 5 — Chunking Engine ✅
- Pluggable strategies: fixed, overlapping, sentence, paragraph, structure_aware
- `getChunkingStrategy()`, `chunkDocument()` in `backend/src/rag/chunking/index.js`
- Strategy stored on document_versions

### Phase 6 — Embedding System ✅
- `EmbeddingProvider` abstraction
- OpenAI provider (with retries, rate-limit handling, caching)
- Mock provider for dev (deterministic hash-based embeddings)

### Phase 7 — Vector Search ✅
- `VectorStore` interface with in-memory implementation
- upsert(), delete(), search(), healthCheck()
- Cosine similarity search with document filtering

### Phase 8 — BM25 / Keyword Search ✅
- `KeywordRetriever` using MySQL FULLTEXT
- Fallback to LIKE search
- Metadata filters (department, documentType, documentIds)

### Phase 9 — Hybrid Retrieval ✅
- BM25 + Vector → Reciprocal Rank Fusion
- Configurable topK, fusion K, rerank topK
- `HybridRetriever.js`

### Phase 10 — Query Rewriting ✅
- Normalization, ambiguity detection
- Heuristic + OpenAI conversational rewriting
- Records whether rewrite was used

### Phase 11 — Metadata Filtering ✅
- Filters applied in hybrid retrieval
- Authorization filtering via `getAccessibleDocumentIds()`

### Phase 12 — Reranking ✅
- `Reranker` abstraction with mock cross-encoder (keyword overlap + prior score blend)

### Phase 13 — Grounded Answer Generation ✅
- `LLMProvider` with strict grounding prompt
- Explicit abstention when evidence insufficient
- Mock + OpenAI providers

### Phase 14 — Citations ✅
- Citation extraction from [N] notation
- Stored in citations table
- Frontend clickable citation badges

### Phase 15 — Citation Verification ✅
- citation_correct, citation_complete, grounded, abstained flags
- Chunk existence validation

### Phase 16 — Chat System ✅
- POST /api/v1/chat with full RAG pipeline
- Conversations, messages, retrieval metadata, usage, latency
- Feedback endpoint (👍/👎)

### Partial — Phase 17 Frontend ✅ (core pages)
- Pages: login, register, dashboard, documents, document detail, chat, evaluations, metrics, settings
- Auth context, protected routes, API service layer

### Partial — Phase 18 RAG Evaluation ✅ (framework)
- `evaluation/metrics.js` — Recall@K, MRR, nDCG, faithfulness, abstention
- `evaluation/run.js` — CLI runner with JSON reports
- Sample dataset in `evaluation/dataset.json`

### Partial — Phase 20 Observability ✅ (per-request)
- usage_metrics table populated on each chat request
- Request IDs, latency breakdown, token/cost tracking

### Partial — Phase 21 Feedback ✅
- POST /chat/feedback endpoint
- Frontend thumbs up/down in chat

### Partial — Phase 22 Security ✅ (core)
- JWT, bcrypt, authorization, document ACL, rate limiting, helmet, CORS, file validation

### Partial — Phase 23 Testing ✅ (unit)
- fusion.test.js: RRF, metrics, chunking, query processing

### Partial — Phase 24 Docker ✅
- Dockerfiles for backend/frontend, docker-compose.yml

### Partial — Phase 25 CI/CD ✅
- GitHub Actions: backend tests, frontend build, evaluation

---

## Files Created (Key)

### Root
- `README.md`, `PROJECT_PROGRESS.md`, `.gitignore`, `.env.example`, `docker-compose.yml`, `package.json`

### Backend
- `src/index.js`, `src/app.js`, `src/config/index.js`
- `src/middleware/` — auth.js, errorHandler.js, requestId.js
- `src/routes/` — health.js, auth.js, documents.js, chat.js
- `src/controllers/` — authController.js, documentController.js, chatController.js
- `src/services/` — userService.js, documentService.js
- `src/db/connection.js`
- `src/rag/chunking/index.js`
- `src/rag/embeddings/EmbeddingProvider.js`
- `src/rag/vector/VectorStore.js`
- `src/rag/retrieval/` — KeywordRetriever.js, HybridRetriever.js, Reranker.js, fusion.js
- `src/rag/query/QueryProcessor.js`
- `src/rag/generation/LLMProvider.js`
- `src/rag/citations/CitationService.js`
- `scripts/migrate.js`

### Frontend
- Full React app with pages and components (see frontend/src/)

### Database
- `database/migrations/001_initial_schema.sql`

### Evaluation
- `evaluation/metrics.js`, `evaluation/run.js`, `evaluation/dataset.json`

### CI
- `.github/workflows/ci.yml`

---

## API Endpoints Added

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/health/health | No | Health |
| GET | /api/v1/health/ready | No | Readiness |
| POST | /api/v1/auth/register | No | Register |
| POST | /api/v1/auth/login | No | Login |
| POST | /api/v1/auth/logout | Yes | Logout |
| GET | /api/v1/auth/me | Yes | Current user |
| POST | /api/v1/documents/upload | Yes | Upload PDF |
| GET | /api/v1/documents | Yes | List documents |
| GET | /api/v1/documents/:id | Yes | Get document |
| GET | /api/v1/documents/:id/status | Yes | Processing status |
| DELETE | /api/v1/documents/:id | Yes | Delete document |
| POST | /api/v1/chat | Yes | RAG chat |
| GET | /api/v1/chat/conversations | Yes | List conversations |
| GET | /api/v1/chat/conversations/:id | Yes | Get messages |
| POST | /api/v1/chat/feedback | Yes | Submit feedback |

---

## Database Changes

- Initial schema with 15 tables (see migration file)
- FULLTEXT index on document_chunks.content
- Document permissions for access control

---

## Known Issues

1. Vector store is in-memory — vectors lost on restart (use Qdrant adapter in production)
2. Background jobs are in-process queue — use Bull/Redis for production scale
3. Metrics dashboard shows placeholders — needs admin API for aggregated metrics
4. Evaluation runner uses mock retrieval — needs live API integration for real eval
5. PDF page-level extraction is simplified (single text blob, not per-page)
6. OpenAI reranker falls back to mock implementation
7. Shell sandbox unavailable on dev machine — npm install not verified in this session

---

## Next Recommended Phase

### Phase 17 (continued) — Frontend Polish
- Wire metrics dashboard to usage_metrics API
- Conversation history sidebar in chat
- Document PDF viewer for citation click-through
- Admin dashboard for feedback analytics

### Phase 19 — Experiment Framework
- Compare chunking strategies, BM25-only, vector-only, hybrid, hybrid+rerank
- Automated experiment runner with CSV/JSON comparison reports

### Phase 23 (continued) — Integration Tests
- Full pipeline test: PDF → ingestion → retrieval → chat
- Auth flow tests, document authorization tests
- Frontend component tests

### Phase 26 — Production Readiness
- API pagination on list endpoints
- Bull/Redis job queue
- Qdrant vector store adapter
- Aggregated metrics API (P50/P95/P99)
- Readiness probe improvements

---

## How to Run

```bash
cp .env.example .env
docker compose up mysql -d
npm run install:all
npm run migrate
npm run dev:backend   # port 3001
npm run dev:frontend  # port 5173
npm test
npm run evaluate
```

---

## Tests Added

- `backend/src/rag/retrieval/fusion.test.js` — RRF, metrics, chunking, query processing

---

## Incomplete Features (for next session)

- [ ] Metrics aggregation API + frontend wiring
- [ ] Experiment comparison framework (Phase 19)
- [ ] Integration tests (Phase 23)
- [ ] Qdrant VectorStore adapter
- [ ] Redis/Bull job queue
- [ ] Per-page PDF extraction
- [ ] Admin feedback analytics dashboard
- [ ] API pagination
- [ ] Production deployment configs (Phase 26)
- [ ] Comprehensive documentation with screenshots (Phase 27)
