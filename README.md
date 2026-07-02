# AskDocs

Ask your documents, get answers with receipts. AskDocs is a retrieval-augmented
(RAG) Q&A workspace: upload PDFs, DOCX, TXT or Markdown, and chat with an
assistant that answers **only** from your files — every claim carries a numbered
citation you can click to see the exact source passage, page and similarity
score.

Everything runs on free tiers: Vercel (hosting), Supabase (Postgres + pgvector,
auth, storage) and Gemini (embeddings + generation).

## Stack

| Layer            | Choice                                        |
| ---------------- | --------------------------------------------- |
| Framework        | Next.js (App Router) + TypeScript + React 19  |
| Styling          | Tailwind v4 + hand-authored shadcn-style primitives |
| AI orchestration | Vercel AI SDK (`ai` + `@ai-sdk/google`)       |
| Generation       | `gemini-2.5-flash` (streaming)                |
| Embeddings       | `gemini-embedding-001` @ 768d, L2-normalized  |
| Database         | Supabase Postgres + pgvector (HNSW, cosine) via Drizzle |
| Auth             | Supabase Auth (`@supabase/ssr`), email + Google OAuth |
| File storage     | Supabase Storage (private bucket, owner-scoped RLS) |
| Hosting          | Vercel                                        |

## How it works

```
upload  ──▶ Supabase Storage ──▶ extract (unpdf/mammoth) ──▶ chunk (~2000 chars,
            200 overlap) ──▶ embed (Gemini, 768d) ──▶ pgvector, one transaction

question ──▶ embed query ──▶ cosine top-5 over the user's own chunks
         ──▶ gemini-2.5-flash with numbered context ──▶ NDJSON stream:
             citations first, then text deltas (so sources render immediately)
```

Tenant isolation is enforced twice: retrieval joins `chunks` to `documents`
filtered by the server-verified user id, and owner-based RLS policies cover
both tables (plus the storage bucket) for anything reaching Postgres through
Supabase's APIs.

## Local setup

```bash
bun install
cp .env.example .env.local   # then fill in the values (see comments inside)
bun run db:migrate           # applies drizzle/ migrations (needs DIRECT_URL)
bun run dev
```

Supabase one-time setup for a fresh project:

1. Create a project, then a **private** storage bucket named `documents`.
2. Apply the Drizzle migrations (`bun run db:migrate`) — tables, pgvector
   index, and table RLS policies.
3. Apply `supabase/migrations/20260701092527_storage_documents_rls.sql` for the
   storage-object RLS policies (Supabase CLI: `supabase db push`).
4. Auth → URL configuration: add `<your-origin>/auth/callback` as a redirect
   URL; enable the Google provider if you want the OAuth button.

## Scripts

| Script                | What it does                          |
| --------------------- | ------------------------------------- |
| `bun run dev`         | dev server                            |
| `bun run build`       | production build                      |
| `bun run test`        | Vitest suite (`test:watch` to watch)  |
| `bun run lint`        | ESLint                                |
| `bun run typecheck`   | `tsc --noEmit`                        |
| `bun run db:generate` | emit a migration from schema changes  |
| `bun run db:migrate`  | apply migrations (uses `DIRECT_URL`)  |

## Testing

`bun run test` runs a node-environment Vitest suite: unit tests for chunking,
embedding normalization, retrieval scoping (the tenant-isolation guarantee),
the NDJSON stream protocol, rate limiting, and all three API route handlers
with services mocked.

## Deploying to Vercel

1. Import the repo; framework preset Next.js — no extra config needed.
2. Set the environment variables from `.env.example` in Project Settings
   (`DIRECT_URL` is only needed where you run migrations; the app itself uses
   the pooled `DATABASE_URL`).
3. Add your production origin to Supabase Auth's redirect URLs.

Uploads are limited to 10 MB and ingestion runs inline in the request
(`maxDuration 60`); per-user rate limits (20 uploads/h, 60 questions/h) keep a
public demo inside the free tiers.
