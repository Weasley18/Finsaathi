# FinSaathi

**AI-powered financial empowerment platform for India's underserved communities** — built in a 24-hour hackathon at **Hack-A-League 4.0** (Global Academy of Technology, Feb 21–22, 2026).

Financial exclusion remains a major barrier for low-income workers, gig earners, and first-generation earners in India. Most fintech apps assume financial literacy and digital fluency the target users don't have. FinSaathi combines an AI chat advisor, SMS-based expense tracking, and human-advisor tooling into one platform, in 12 Indian languages.

> **Status:** Not deployed publicly. Runs locally as a multi-service Docker Compose stack.

## Features

### For End Users
- **AI Chat Financial Advisor** — a conversational assistant (served locally via Ollama) that uses LLM function calling over 12 data tools (transactions, budgets, goals, health score, uploaded documents, government schemes …) to pull the user's real data before answering, instead of guessing. The user id is bound on the server, so the model can only ever read the signed-in user's data.
- **SMS expense import** — paste bank / UPI SMS messages and they are parsed into transactions. The rule-based parser handles common SBI, HDFC, ICICI, Axis, Kotak and UPI-app formats (including SBI's "debited by 250.00" UPI format), rejects OTPs, promotions, bill reminders and failed payments, de-duplicates re-imports, and falls back to the LLM only for real transactions it cannot read.
- **Auto-categorisation** — a rule-based categoriser maps merchants, UPI handles and descriptions to 25 India-specific spending categories plus Salary. It is the single source of truth for category names, so SMS imports, manual entries, budgets and the ML service always agree.
- **Spending forecast** — month-end projection = actual spend so far + a Prophet forecast of day-to-day spending for the remaining days + recurring bills (rent, EMI …) still due. Trained on expenses only, with zero-spend days filled in.
- **Anomaly detection** — Isolation Forest flags months where a category is unusually high and one-off unusually large expenses. Income and recurring bills are excluded, so salary and rent are never reported as anomalies.
- **Financial Health Score** — a rule-based weighted score (savings rate, goal progress, budget discipline, debt-to-income, emergency fund, spending consistency) with per-factor explanations.
- **Adaptive budget** — 50/30/20 (or 60/20/20 for low incomes) recommendations, split across the user's own categories in proportion to their spending.
- **Savings goals & gamification** — streaks, points and badges, with per-day caps so points cannot be farmed.
- **Encrypted document vault** — uploaded documents are encrypted with AES-256-GCM before they reach MinIO (S3-compatible storage). Text from PDFs is extracted and indexed in ChromaDB so the chat can answer questions about the user's own documents (RAG).
- **Multilingual support** — UI in 12 languages (English, Hindi, Kannada, Tamil, Telugu, Bengali, Marathi, Gujarati, Punjabi, Malayalam, Odia, Assamese). Chat messages are translated via Helsinki-NLP opus-mt (HuggingFace Inference API, Redis-cached) with an Ollama fallback.

### For Financial Advisors
- Client dashboard, client notes, flags and scheduled calls; messaging restricted to assigned advisor ↔ client pairs.
- **Advisor Clone** — each advisor's notes and past answers are embedded into their own ChromaDB collection; when the advisor is offline, the clone retrieves their relevant past advice and answers in their style.

### For Partners & Admins
- Partner product listing and matching.
- Role-based access control across four personas (`END_USER`, `ADVISOR`, `PARTNER`, `ADMIN`) via Fastify middleware. Advisor/partner accounts start `PENDING` and only an admin can approve, reject or change an advisor's tier.
- Audit log of sensitive actions (role applications, approvals/rejections, tier changes, client assignment, user updates/deletion, document verification and cross-user document access).

## Tech Stack

| Layer | Stack |
|---|---|
| **Web frontend** | React 19 + Vite, React Router, i18next, Recharts |
| **Mobile frontend** | React Native + Expo (SDK 54), Zustand, TanStack Query |
| **Backend** | Node.js + TypeScript on **Fastify**, Prisma ORM, PostgreSQL (28 models), Redis (translation cache), MinIO (S3-compatible storage), JWT auth, Swagger UI at `/api/docs` |
| **AI — Chat** | Ollama (`llama3.1:8b`) with function calling; ChromaDB + Ollama embeddings (`nomic-embed-text`) for RAG over user documents and the Advisor Clone |
| **AI — Numerical** | Python FastAPI microservice: scikit-learn Isolation Forest, Prophet |
| **AI — Translation** | Helsinki-NLP `opus-mt` via HuggingFace Inference API, Redis-cached, Ollama fallback |
| **Security** | OTP login (hashed, attempt-limited), JWT, RBAC, AES-256-GCM for PII fields and stored documents, audit log |
| **Infra** | Docker Compose orchestrating all services |

## Architecture

A root-level `docker-compose.yml` runs the full stack:

| Service | Purpose | Local port |
|---|---|---|
| `backend` | Fastify API (runs DB migrations on start) | `3001` |
| `web-app` | React web app (Nginx, proxies `/api` to the backend) | `3000` |
| `ml-service` | Python FastAPI (Isolation Forest, Prophet) | `8000` |
| `chromadb` | Vector store for RAG (documents + Advisor Clone) | `8001` |
| `ollama` | Local LLM + embedding model serving | `11434` |
| `ollama-init` | One-shot job that pulls `llama3.1:8b` and `nomic-embed-text` | — |
| `minio` | Encrypted document storage (console on `9001`) | `9000` |
| `postgres` / `redis` | Primary DB / translation cache | `5432` / `6379` |

The Node backend calls the Python `ml-service` over HTTP for anomaly detection and forecasting, with simpler built-in fallbacks if the ML service is unreachable.

## Getting Started (Docker)

```bash
# 1. Configure environment — the stack refuses to start without these secrets
cp .env.docker.example .env
#   JWT_SECRET       node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
#   ENCRYPTION_KEY   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
#   MINIO_SECRET_KEY any password of 8+ characters

# 2. Build and start
docker compose up --build
# First start pulls llama3.1:8b (~4.7 GB) and nomic-embed-text (~270 MB).
```

Then open:
- Web app: `http://localhost:3000`
- API docs (Swagger UI): `http://localhost:3001/api/docs`
- Backend health: `http://localhost:3001/api/health`
- ML service health: `http://localhost:8000/health`
- MinIO console: `http://localhost:9001`

**Logging in locally:** with no SMS gateway configured (`MSG91_AUTH_KEY` empty) and `EXPOSE_DEV_OTP=true` (the default in `.env.docker.example`), the OTP is shown in the app after you request it. Set `EXPOSE_DEV_OTP=false` and configure MSG91 for any real deployment.

**Making an admin:** sign in once, then promote your account:
```bash
docker compose exec postgres psql -U finsaathi -c "update users set role='ADMIN' where phone='<your phone>';"
```
(sign in again to get a token with the new role). `npm run db:seed` in `backend/` loads demo users and data instead.

Stop the stack:
```bash
docker compose down       # keep data
docker compose down -v    # also remove persisted volumes
```

## Local Development (without Docker)

```bash
# Infrastructure: Postgres, Redis, MinIO, ChromaDB (>= 0.6), Ollama
ollama pull llama3.1:8b && ollama pull nomic-embed-text

# Backend
cd backend
cp .env.example .env            # fill in the values
npm install
npx prisma migrate deploy
npm run dev                     # http://localhost:3001

# ML service (Python 3.11)
cd ml-service
pip install -r requirements.txt
uvicorn main:app --port 8000

# Web
cd web-app && npm install && npm run dev

# Mobile — set your machine's LAN IP so a phone/emulator can reach the API
cd financial-app && npm install
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:3001/api npx expo start
```

## Tests

```bash
cd ml-service && pip install -r requirements-dev.txt && pytest   # 13 behavioural tests for the ML endpoints
cd backend && npm test && npm run build                          # SMS parser / category tests + strict TypeScript build
cd web-app && npm run lint && npm run build
```

## Known Gaps / Roadmap

- The chat LLM is a stock `llama3.1:8b` — no fine-tuning yet.
- SMS import is paste-based; reading the SMS inbox directly would need a native Android module and the `READ_SMS` permission.
- Image documents are stored but only indexed for RAG when a HuggingFace key is configured for OCR.
- Not deployed to a public environment — local Docker Compose only.

## Data Sources

Public/open datasets referenced for model context and validation: MFAPI.in (mutual fund NAVs), RBI DBIE (interest rates, inflation), NSE India (market data), Open Government Data (income/employment by district).

---

*Built for Hack-A-League 4.0, Global Academy of Technology — February 21–22, 2026.*
