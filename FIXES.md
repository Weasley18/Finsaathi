# Fix log — November 2026

Everything below was verified by running the code: the backend was built and run
against a database created only from `prisma/migrations`, with Redis, an
S3-compatible store, ChromaDB 0.6.3 and the ML service (Python 3.11, same pins as
the Dockerfile).

## Security
| Problem | Fix |
|---|---|
| Calling `/auth/complete-profile` again approved a pending/rejected advisor (`approvalStatus` defaulted to `APPROVED`) and accepted `tier: "PREMIUM"` | Role can only be chosen once by an approved END_USER; `approvalStatus` is only ever set to `PENDING` there. `tier` removed from the schema; new advisors start `FREE`. Approve/reject/tier are admin-only. `requireTier` now reads the tier from the DB, not the JWT |
| Hard-coded JWT fallback secret `finsaathi-dev-secret` | Server exits in production without `JWT_SECRET`; dev uses a random per-process secret. Compose refuses to start without `JWT_SECRET`, `ENCRYPTION_KEY`, `MINIO_SECRET_KEY` |
| Unlimited OTP guesses, OTP stored in plaintext | OTP burned after 5 wrong attempts; only an HMAC-SHA256 is stored; constant-time compare |
| Gamification points/streak could be farmed by repeated calls | Per-day caps per action; streak counts calendar days |
| Audit log table never written | `logAudit()` on role applications, approvals/rejections, tier changes, client (re)assignment, user update/delete, document verification and cross-user document download |
| Uploaded documents stored unencrypted despite README claim | AES-256-GCM encryption before upload to MinIO, decryption on download |
| PAN cards, ID cards, results etc. committed in `backend/uploads/` | Removed from the tree and git-ignored (**history still needs purging — see below**) |

## Build & deployment
| Problem | Fix |
|---|---|
| `npm run build` failed (103 TS errors) → Docker image could not build | Removed the `as any` on the Prisma client and fixed the real type errors; strict build passes |
| Migrations created 18/28 tables and were missing 105 columns | New migration `20261113120000_sync_schema`; a fresh DB built from migrations is identical to `schema.prisma` |
| `ollama-init` ran `ollama /bin/sh -c …` and failed, blocking the backend | Entrypoint overridden to `/bin/sh -c`; also pulls the embedding model |
| MinIO missing from compose → every upload failed | `minio` service with health check, credentials and volume |
| Swagger advertised at `/api/docs` but not registered | `@fastify/swagger` + UI registered |
| Unused deps (BullMQ, casbin, sqlite3) | Removed; README no longer claims them |
| Prisma on alpine needs OpenSSL | Added to the backend image |

## AI / ML
| Problem | Fix |
|---|---|
| Chroma JS client (v2 API) vs server 0.5.5 (v1 API); no embedding function installed → RAG and Advisor Clone silently returned nothing | ChromaDB 0.6.3; shared `vectorStore.ts` with Ollama embeddings (`nomic-embed-text`) |
| `pdf-parse` v2 API change → PDFs never indexed | Uses the v2 `PDFParse` class |
| `cmdstanpy` unpinned → Prophet never loaded, silent linear fallback | Pinned `cmdstanpy==1.2.4` |
| Income sent to the ML models → salary flagged as an "unusually large expense", forecast ₹82k for a ₹14.4k month | Expense-only in both backend and ML service |
| Prophet trained without zero-spend days; past days double counted | Complete daily series; projection = actual so far + Prophet for remaining days + pending recurring bills. Same dataset now projects ₹14,910 vs true ₹14,388 |
| Rent flagged as an anomaly every month | Recurring payments detected and excluded from outlier checks |
| Adaptive budget said "saving ₹5,000 less than recommended" at a 57% savings rate | Savings = income − spending |
| SMS parser: missed SBI UPI format, salary as expense, bill reminders imported, ISO dates misread, junk merchants (11/14) | Rewritten: completed-transaction filter, first-keyword direction, ISO/`12Nov24`/DD-MM date parsing, merchant extraction per format (all test cases pass) |
| SMS imports used different category names than budgets/ML | One taxonomy (`categorizer.ts`) + `normalizeCategory()` for all writes |

## Clients
| Problem | Fix |
|---|---|
| Mobile admin screens called 7 non-existent endpoints | Pointed at the real routes; assign-by-phone supported by the API |
| Frontends expected a dev OTP that the API no longer returned | Returned only when no SMS gateway is configured and not in production (or `EXPOSE_DEV_OTP=true`) |
| 43 web lint errors | 0 errors |
| README claimed PWA, BullMQ, MCP, automated SMS reading | README rewritten to match the code |

## Tests added
- `ml-service/tests/test_main.py` — 13 behavioural tests (`pytest`)
- `backend/test/smsParser.test.ts` — 18 parser / taxonomy tests (`npm test`)

## Still to do by you
0. If you apply `finsaathi-fixes.patch` to your own clone instead of using the zip,
   also remove the committed junk/PII files (the patch deliberately does not
   contain them):
   ```bash
   git rm -r -q backend/uploads backend/prisma/dev.db backend/prisma/seed.js backend/prisma/seed.js.map \
     backend/prisma/seed.d.ts backend/prisma/seed.d.ts.map dump.rdb pdf_text.txt \
     web-app/app_eslint_report.txt web-app/build_output.txt
   ```
1. **Purge the personal documents from git history** before pushing anywhere
   (`git filter-repo --path backend/uploads --invert-paths`, then force-push) and
   assume anything already public may have been copied.
2. Generate real secrets in `.env` (see `.env.docker.example`).
