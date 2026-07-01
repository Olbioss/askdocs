# SP1 · Test Foundation + Cleanup — Design

## Context

AskDocs' backend is now implemented — the `upload`, `chat`, and `documents` route
handlers, the ingest pipeline (`lib/ai/*`, `lib/rag/ingest`), and user-scoped
retrieval (`lib/rag/retrieve`) — and `USE_MOCKS` is off. But there are **no tests**,
and the codebase still carries a now-dead mock path (`lib/data/mocks.ts`, 263 lines).

This is the first of four decomposed "production-hardening polish" sub-projects:

1. **SP1 — Test foundation + cleanup** ← this spec
2. SP2 — Robustness (error handling + edge cases, TDD'd on SP1's harness)
3. SP3 — UI/UX polish (states, mobile, a11y)
4. SP4 — Docs & DX (README, `.env.example`, setup)

SP1 establishes a Vitest safety net and performs **only** the cleanup a test net makes
safe. It deliberately changes **no runtime behavior** — the tests are *characterization*
tests that lock in what the code does today, so later sub-projects can refactor with a guard.

## Goals

- A working Vitest harness (node environment) with `@/…` path resolution.
- Characterization tests around the pure RAG logic and all three route handlers (services mocked).
- Remove the dead mock path; thin the route handlers by extracting DB access; small consistency fixes.

## Non-goals (owned by later sub-projects)

- New robustness behavior / error UX → **SP2**
- UI states, mobile, accessibility, component tests → **SP3**
- README / docs / `.env.example` → **SP4**
- Integration / E2E; real Supabase, DB, or Gemini calls (everything here is mocked)

## A. Test tooling

- Dev deps: `vitest`, `vite-tsconfig-paths` (so `@/…` resolves the same as the app).
- `vitest.config.ts` at repo root: `environment: 'node'`, `plugins: [tsconfigPaths()]`, include `**/*.test.ts`.
- `package.json` scripts: `test` → `vitest run`, `test:watch` → `vitest`.
- Test files colocated with their source as `<name>.test.ts`; test files import `{ describe, it, expect, vi }` from `vitest` explicitly (no reliance on globals, to avoid touching the app tsconfig).
- Rationale: SP1's targets are pure functions and route handlers (plain modules) — a node environment is enough; no jsdom or React plugin is needed until component tests arrive in SP3.

## B. Cleanup

### B1. Delete the mock path
- `lib/data/client.ts`: remove the `USE_MOCKS` constant, the `import * as mocks`, and every `if (USE_MOCKS) …` branch. Each function calls `/api/*` directly.
- Delete `lib/data/mocks.ts`.
- Confirm nothing else imports `mocks` or references `USE_MOCKS`.

### B2. Extract route DB access → `lib/db/documents.ts`
Thin, typed data-access helpers, so route handlers hold only auth / validation /
orchestration and tests mock a small surface instead of drizzle's fluent chain:

- `createDocument({ userId, filename, filePath })` → inserts, returns the row.
- `listDocumentsWithCounts(userId)` → documents + per-doc chunk counts, newest first.
- `getOwnedDocument(id, userId)` → `{ id, filePath } | undefined`.
- `deleteOwnedDocument(id, userId)` → deletes the row (chunks cascade via FK).

The `upload` and `documents` routes call these instead of inline `db.select/insert/delete`.
The `chat` route already goes through `retrieveChunks` and touches no db directly.

### B3. Minor consistency
- A `jsonError(message, status, extra?)` helper (e.g. `lib/http.ts`) returning
  `Response.json({ error: message, ...extra }, { status })`; used across the three routes
  for uniform error bodies. (Pure reshaping of existing error responses — no new behavior.)
- Rename `citations864` → `citationsB64` in the chat route.
- Export `buildSystemPrompt` and `toCitations` from the chat route module so they're unit-testable.

## C. Tests

Characterization only — assert current behavior; do not change it.

### C1. Pure unit
- **`lib/ai/chunk.test.ts`** — single page under size → one chunk; multi-paragraph packing to `CHARS_PER_CHUNK`; overlap carried between consecutive chunks; a single giant paragraph hard-split with overlap; empty text → `[]`; page numbers preserved; `chunkIndex` increments across pages.
- **`lib/ai/embed.test.ts`** — mock `ai`'s `embed`/`embedMany`; assert outputs are L2-normalized (‖v‖ ≈ 1), input order preserved, `outputDimensionality: 768` and the correct `taskType` are passed (`RETRIEVAL_DOCUMENT` vs `RETRIEVAL_QUERY`), and empty input → `[]`.
- **`app/api/chat/route.test.ts`** (pure-function portion) — `buildSystemPrompt`: 0 chunks → the "no info, don't guess" prompt; N chunks → numbered `[i]` context lines carrying source filename + page. `toCitations`: maps `id`/`documentId`/`documentName`/`similarity` (3 dp)/`metadata.page`, with marker index aligned to array order.
- **`lib/format.test.ts`** — `relativeTime` (just now / `m` / `h` / `d` / absolute date), `formatBytes` (B/KB/MB, `undefined` → "—"), `fileExt`.

### C2. Retrieval scoping (security-critical)
- **`lib/rag/retrieve.test.ts`** — mock `embedQuery` and the db layer; assert the query is constrained to `documents.userId === userId` (and, when `documentId` is supplied, additionally to that document), and that matches below `minSimilarity` are excluded. Locks the tenant-isolation guarantee.

### C3. Route handlers (mocked)
Mock `@/lib/supabase/server` (fake `createClient` → `auth.getUser`, `storage.from().upload/remove`),
the new `lib/db/documents` helpers, `@/lib/rag/{retrieve,ingest}`, and `ai`'s `streamText`.

- **`app/api/upload/route.test.ts`** — 401 (no user); 400 (no file); 415 (legacy `.doc`); 415 (unsupported mime); 413 (> 10 MB); happy → `{ id, filename, createdAt, status: "ready", chunkCount }`; storage error → 500; ingest throws → 500 with `status: "failed"`.
- **`app/api/chat/route.test.ts`** (handler portion) — 401; 400 (empty question); retrieval throws → 500 `{ error }`; happy → response carries the `x-citations` header (base64 of the citations) and a text stream; `documentId` + `user.id` are passed into `retrieveChunks`.
- **`app/api/documents/route.test.ts`** — GET: 401; happy → array mapped to the `Document` shape (no `userId`/`filePath`), newest first, `chunkCount` present. DELETE: 401; 400 (no `id`); 404 (not owned → `getOwnedDocument` returns undefined); happy → calls storage `remove([filePath])` and `deleteOwnedDocument`, returns `{ ok: true }`.

## Verification

- `bun run test` → all green.
- `bun run build` → compiles and type-checks clean.
- `lib/data/mocks.ts` is gone; no `USE_MOCKS` references remain anywhere.
- `upload` and `documents` route handlers contain no inline drizzle chains (moved to `lib/db/documents.ts`).
- No runtime behavior change versus current `main` (characterization only).
