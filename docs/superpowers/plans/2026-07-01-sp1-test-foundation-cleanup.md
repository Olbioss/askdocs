# SP1 · Test Foundation + Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Vitest safety net over AskDocs' RAG logic and route handlers, then do the cleanup that a test net makes safe — with no runtime behavior change.

**Architecture:** Add Vitest (node env, `@/` resolution). Write characterization tests for pure functions (chunking, embedding, prompt/citation building, formatting) and for the three API route handlers with Supabase/db/AI mocked. Extract inline route DB queries into `lib/db/documents.ts` so handlers stay thin and testable, add a `jsonError` helper, and delete the dead mock path.

**Tech Stack:** TypeScript, Next.js 16 (App Router route handlers), Vitest, `vite-tsconfig-paths`, Drizzle ORM, `@supabase/ssr`, Vercel AI SDK (`ai` v7 + `@ai-sdk/google`), bun.

## Global Constraints

- Package manager is **bun**. Run tests with `bun run test`; run single files with `bunx vitest run <file>`.
- Vitest `environment: 'node'`; `@/…` resolves via `vite-tsconfig-paths`.
- Test files are colocated as `<name>.test.ts` and import `{ describe, it, expect, vi, beforeEach }` from `vitest` explicitly (no globals).
- New dev dependencies are limited to exactly: `vitest`, `vite-tsconfig-paths`.
- Embedding dimension is **768**; task types are `RETRIEVAL_DOCUMENT` (documents) and `RETRIEVAL_QUERY` (queries).
- These are **characterization** tests: assert what the code does today. Tests of existing functions must pass immediately; if one fails, the test encodes the wrong expectation — fix the test to match real output, do not change app behavior.
- Every commit message ends with the trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` (shown as a second `-m` in each commit step).
- After every task: `bun run build` must still compile + type-check clean.

---

### Task 1: Vitest setup (proven by format util tests)

**Files:**
- Modify: `package.json` (add dev deps + scripts)
- Create: `vitest.config.ts`
- Test: `lib/format.test.ts`

**Interfaces:**
- Consumes: `@/lib/format` — `relativeTime(iso: string): string`, `formatBytes(bytes?: number): string`, `fileExt(filename: string): string`
- Produces: a working `bun run test`; the `@/` alias resolving in tests.

- [ ] **Step 1: Install dev dependencies**

Run:
```bash
bun add -d vitest vite-tsconfig-paths
```
Expected: `vitest` and `vite-tsconfig-paths` added under `devDependencies`.

- [ ] **Step 2: Add test scripts to `package.json`**

In the `"scripts"` block, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Write the format tests**

Create `lib/format.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { relativeTime, formatBytes, fileExt } from "@/lib/format";

describe("formatBytes", () => {
  it("handles undefined", () => expect(formatBytes(undefined)).toBe("—"));
  it("formats bytes", () => expect(formatBytes(0)).toBe("0 B"));
  it("formats KB with one decimal under 10", () =>
    expect(formatBytes(1536)).toBe("1.5 KB"));
  it("formats whole KB", () => expect(formatBytes(184320)).toBe("180 KB"));
  it("formats MB", () => expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB"));
});

describe("fileExt", () => {
  it("upper-cases the extension", () => expect(fileExt("a.pdf")).toBe("PDF"));
  it("uses last dot", () => expect(fileExt("a.tar.gz")).toBe("GZ"));
  it("returns FILE when no extension", () => expect(fileExt("noext")).toBe("FILE"));
});

describe("relativeTime", () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date("2026-07-01T12:00:00Z")));
  afterEach(() => vi.useRealTimers());

  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  it("just now under a minute", () => expect(relativeTime(ago(30_000))).toBe("just now"));
  it("minutes", () => expect(relativeTime(ago(5 * 60_000))).toBe("5m ago"));
  it("hours", () => expect(relativeTime(ago(2 * 3_600_000))).toBe("2h ago"));
  it("days", () => expect(relativeTime(ago(3 * 86_400_000))).toBe("3d ago"));
  it("absolute date beyond a week", () => {
    const iso = ago(30 * 86_400_000);
    const expected = new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    expect(relativeTime(iso)).toBe(expected);
  });
});
```

- [ ] **Step 5: Run tests — expect PASS (harness + `@/` alias work)**

Run: `bun run test`
Expected: PASS, `lib/format.test.ts` green (13 tests). If a `formatBytes` expectation is off, fix the expected string to match actual output (characterization).

- [ ] **Step 6: Verify build still clean**

Run: `bun run build`
Expected: `✓ Compiled` + `Finished TypeScript`.

- [ ] **Step 7: Commit**

```bash
git add package.json bun.lock vitest.config.ts lib/format.test.ts
git commit -m "test: add Vitest harness + format util tests" \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: chunkPages characterization tests

**Files:**
- Test: `lib/ai/chunk.test.ts`

**Interfaces:**
- Consumes: `@/lib/ai/chunk` — `chunkPages(pages: { page: number; text: string }[]): { content: string; metadata: { page: number; chunkIndex: number } }[]`. Constants in source: `CHARS_PER_CHUNK = 2000`, `OVERLAP_CHARS = 200`.

- [ ] **Step 1: Write the tests**

Create `lib/ai/chunk.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { chunkPages } from "@/lib/ai/chunk";

describe("chunkPages", () => {
  it("returns [] for no pages", () => expect(chunkPages([])).toEqual([]));

  it("emits one chunk for a short page with page + index metadata", () => {
    const out = chunkPages([{ page: 1, text: "hello world" }]);
    expect(out).toEqual([
      { content: "hello world", metadata: { page: 1, chunkIndex: 0 } },
    ]);
  });

  it("splits at size and carries overlap between chunks", () => {
    const a = "A".repeat(1500);
    const b = "B".repeat(1500);
    const out = chunkPages([{ page: 1, text: `${a}\n\n${b}` }]);
    expect(out).toHaveLength(2);
    expect(out[0].content).toBe(a);
    expect(out[1].content.startsWith("A".repeat(200))).toBe(true);
    expect(out[1].content.endsWith(b)).toBe(true);
    expect(out.map((c) => c.metadata.chunkIndex)).toEqual([0, 1]);
  });

  it("hard-splits a single giant paragraph with overlap", () => {
    const out = chunkPages([{ page: 1, text: "C".repeat(2500) }]);
    expect(out).toHaveLength(2);
    expect(out[0].content).toBe("C".repeat(2000));
    expect(out[1].content).toBe("C".repeat(700));
  });

  it("preserves page numbers and increments chunkIndex across pages", () => {
    const out = chunkPages([
      { page: 5, text: "x" },
      { page: 9, text: "y" },
    ]);
    expect(out).toEqual([
      { content: "x", metadata: { page: 5, chunkIndex: 0 } },
      { content: "y", metadata: { page: 9, chunkIndex: 1 } },
    ]);
  });
});
```

- [ ] **Step 2: Run — expect PASS**

Run: `bunx vitest run lib/ai/chunk.test.ts`
Expected: PASS (5 tests). If an overlap/length expectation is off, recompute from the source algorithm and fix the expectation.

- [ ] **Step 3: Commit**

```bash
git add lib/ai/chunk.test.ts
git commit -m "test: characterize chunkPages (overlap, hard-split, page tracking)" \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: embed tests (mocked AI SDK)

**Files:**
- Test: `lib/ai/embed.test.ts`

**Interfaces:**
- Consumes: `@/lib/ai/embed` — `embedChunks(texts: string[]): Promise<number[][]>`, `embedQuery(text: string): Promise<number[]>`. Both call `ai`'s `embedMany`/`embed` and normalize to unit length; `@ai-sdk/google`'s `google.embeddingModel(...)` runs at module load.

- [ ] **Step 1: Write the tests**

Create `lib/ai/embed.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@ai-sdk/google", () => ({
  google: { embeddingModel: () => ({ id: "gemini-embedding-001" }) },
}));
vi.mock("ai", () => ({ embed: vi.fn(), embedMany: vi.fn() }));

import { embed, embedMany } from "ai";
import { embedChunks, embedQuery } from "@/lib/ai/embed";

describe("embedChunks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns [] and skips the model for empty input", async () => {
    expect(await embedChunks([])).toEqual([]);
    expect(embedMany).not.toHaveBeenCalled();
  });

  it("L2-normalizes each vector and preserves order", async () => {
    vi.mocked(embedMany).mockResolvedValue({ embeddings: [[3, 4], [0, 5]] } as never);
    expect(await embedChunks(["a", "b"])).toEqual([[0.6, 0.8], [0, 1]]);
  });

  it("requests 768 dims with RETRIEVAL_DOCUMENT", async () => {
    vi.mocked(embedMany).mockResolvedValue({ embeddings: [[1, 0]] } as never);
    await embedChunks(["a"]);
    expect(embedMany).toHaveBeenCalledWith(
      expect.objectContaining({
        values: ["a"],
        providerOptions: {
          google: { outputDimensionality: 768, taskType: "RETRIEVAL_DOCUMENT" },
        },
      }),
    );
  });
});

describe("embedQuery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalizes and uses RETRIEVAL_QUERY", async () => {
    vi.mocked(embed).mockResolvedValue({ embedding: [3, 4] } as never);
    expect(await embedQuery("q")).toEqual([0.6, 0.8]);
    expect(embed).toHaveBeenCalledWith(
      expect.objectContaining({
        value: "q",
        providerOptions: {
          google: { outputDimensionality: 768, taskType: "RETRIEVAL_QUERY" },
        },
      }),
    );
  });
});
```

- [ ] **Step 2: Run — expect PASS**

Run: `bunx vitest run lib/ai/embed.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 3: Commit**

```bash
git add lib/ai/embed.test.ts
git commit -m "test: characterize embed normalization + task types (mocked AI SDK)" \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: retrieveChunks mapping + wiring test

**Files:**
- Test: `lib/rag/retrieve.test.ts`

**Interfaces:**
- Consumes: `@/lib/rag/retrieve` — `retrieveChunks(question: string, userId: string, opts: { documentId?: string; matchCount?: number; minSimilarity?: number }): Promise<RetrievedChunk[]>` where `RetrievedChunk = { id; content; documentId; filename; page: number | null; chunkIndex: number | null; similarity: number }`.

> Note: with a mocked `db`, the SQL-level `userId`/`minSimilarity` filtering can't be inspected. This test locks the **mapping + query wiring** (embed call, `documents` join, `limit`). Authoritative per-user SQL scoping is asserted indirectly by the chat route test (Task 9 checks the route passes `user.id` into `retrieveChunks`); a true DB-level scoping check is an integration test deferred to a later sub-project.

- [ ] **Step 1: Write the tests**

Create `lib/rag/retrieve.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const chain = {
  select: vi.fn(() => chain),
  from: vi.fn(() => chain),
  innerJoin: vi.fn(() => chain),
  where: vi.fn(() => chain),
  orderBy: vi.fn(() => chain),
  limit: vi.fn(),
};
vi.mock("@/lib/db", () => ({ db: chain }));
vi.mock("@/lib/ai/embed", () => ({ embedQuery: vi.fn() }));

import { embedQuery } from "@/lib/ai/embed";
import { retrieveChunks } from "@/lib/rag/retrieve";

describe("retrieveChunks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("embeds the question, joins documents, maps rows, honors matchCount", async () => {
    vi.mocked(embedQuery).mockResolvedValue([0.1, 0.2]);
    chain.limit.mockResolvedValue([
      {
        id: "c1",
        content: "hello",
        documentId: "d1",
        filename: "a.pdf",
        metadata: { page: 3, chunkIndex: 2 },
        similarity: 0.91,
      },
    ]);

    const out = await retrieveChunks("q", "user-1", { matchCount: 4 });

    expect(embedQuery).toHaveBeenCalledWith("q");
    expect(chain.innerJoin).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalled();
    expect(chain.limit).toHaveBeenCalledWith(4);
    expect(out).toEqual([
      {
        id: "c1",
        content: "hello",
        documentId: "d1",
        filename: "a.pdf",
        page: 3,
        chunkIndex: 2,
        similarity: 0.91,
      },
    ]);
  });

  it("defaults page/chunkIndex to null and matchCount to 5", async () => {
    vi.mocked(embedQuery).mockResolvedValue([0.1]);
    chain.limit.mockResolvedValue([
      { id: "c2", content: "x", documentId: "d2", filename: "b.md", metadata: null, similarity: 0.5 },
    ]);
    const out = await retrieveChunks("q", "user-1", {});
    expect(out[0].page).toBeNull();
    expect(out[0].chunkIndex).toBeNull();
    expect(chain.limit).toHaveBeenCalledWith(5);
  });
});
```

- [ ] **Step 2: Run — expect PASS**

Run: `bunx vitest run lib/rag/retrieve.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 3: Commit**

```bash
git add lib/rag/retrieve.test.ts
git commit -m "test: characterize retrieveChunks mapping + query wiring" \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: `jsonError` helper (TDD)

**Files:**
- Create: `lib/http.ts`
- Test: `lib/http.test.ts`

**Interfaces:**
- Produces: `jsonError(message: string, status: number, extra?: Record<string, unknown>): Response` — returns `Response.json({ error: message, ...extra }, { status })`. Consumed by Tasks 7–9.

- [ ] **Step 1: Write the failing test**

Create `lib/http.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { jsonError } from "@/lib/http";

describe("jsonError", () => {
  it("sets the status and an { error } body", async () => {
    const res = jsonError("nope", 400);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "nope" });
  });

  it("merges extra fields", async () => {
    const res = jsonError("bad", 500, { detail: "x" });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "bad", detail: "x" });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bunx vitest run lib/http.test.ts`
Expected: FAIL — cannot resolve `@/lib/http`.

- [ ] **Step 3: Implement `lib/http.ts`**

```ts
/** Uniform JSON error response for API route handlers. */
export function jsonError(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
) {
  return Response.json({ error: message, ...extra }, { status });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bunx vitest run lib/http.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/http.ts lib/http.test.ts
git commit -m "feat: add jsonError helper for uniform API error responses" \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Delete the dead mock path

**Files:**
- Modify: `lib/data/client.ts` (remove `USE_MOCKS` + all mock branches)
- Delete: `lib/data/mocks.ts`

**Interfaces:**
- Produces: `lib/data/client.ts` exporting `listDocuments`, `uploadDocument`, `deleteDocument`, `askQuestion` that call `/api/*` directly (unchanged signatures). No `USE_MOCKS` export.

- [ ] **Step 1: Confirm nothing else depends on the mock seam**

Run:
```bash
grep -rn "USE_MOCKS\|data/mocks" app lib components | grep -v "lib/data/client.ts"
```
Expected: no output (only `client.ts` references them).

- [ ] **Step 2: Rewrite `lib/data/client.ts` (drop the branches + mock import)**

Replace the whole file with:
```ts
// Typed client for the app's data needs. Calls the /api/* route handlers.

import type { AskInput, ChatStreamEvent, Citation, Document } from "@/lib/types";

export async function listDocuments(): Promise<Document[]> {
  const res = await fetch("/api/documents", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load documents");
  return (await res.json()) as Document[];
}

export async function uploadDocument(file: File): Promise<Document> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  return (await res.json()) as Document;
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`/api/documents?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Delete failed");
}

export async function* askQuestion(
  input: AskInput,
): AsyncGenerator<ChatStreamEvent> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok || !res.body) throw new Error("Chat request failed");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) yield { type: "text", value: chunk };
  }

  const encoded = res.headers.get("x-citations");
  if (encoded) {
    try {
      const citations = JSON.parse(atob(encoded)) as Citation[];
      yield { type: "citations", value: citations };
    } catch {
      // ignore malformed citation payloads
    }
  }
}
```

- [ ] **Step 3: Delete the mock module**

Run:
```bash
git rm lib/data/mocks.ts
```

- [ ] **Step 4: Verify build + tests still clean**

Run: `bun run build && bun run test`
Expected: build compiles; all existing tests still green.

- [ ] **Step 5: Commit**

```bash
git add lib/data/client.ts
git commit -m "refactor: remove dead USE_MOCKS path and mock fixtures" \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Upload route — extract `createDocument`, adopt `jsonError`, add handler tests

**Files:**
- Create: `lib/db/documents.ts` (with `createDocument`)
- Modify: `app/api/upload/route.ts` (use `createDocument` + `jsonError`, drop inline db)
- Test: `app/api/upload/route.test.ts`

**Interfaces:**
- Consumes: `jsonError` (Task 5).
- Produces: `createDocument(input: { userId: string; filename: string; filePath: string }): Promise<{ id: string; userId: string; filename: string; filePath: string; status: string | null; createdAt: Date | null }>`. Consumed by later route work.

- [ ] **Step 1: Create the data-access helper**

Create `lib/db/documents.ts`:
```ts
import { db } from "./index";
import { documents } from "./schema";

/** Insert a new document row (status: processing) and return it. */
export async function createDocument(input: {
  userId: string;
  filename: string;
  filePath: string;
}) {
  const [doc] = await db
    .insert(documents)
    .values({ ...input, status: "processing" })
    .returning();
  return doc;
}
```

- [ ] **Step 2: Refactor the upload route to use it**

In `app/api/upload/route.ts`: remove the `db` and `documents` schema imports; import `createDocument` and `jsonError`; replace error `NextResponse.json({error},{status})` calls with `jsonError`; replace the inline insert. The handler body becomes:
```ts
import { SUPPORTED_MIMES } from "@/lib/ai/extract";
import { createDocument } from "@/lib/db/documents";
import { ingestDocument } from "@/lib/rag/ingest";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/http";
import { NextResponse } from "next/server";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Ingestion runs inline (extract → embed → store), so give large files headroom.
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("Unauthorized", 401);
  const userId = user.id;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("No file provided", 400);

  if (file.type === "application/msword") {
    return jsonError(
      "Legacy .doc files aren't supported — please save as .docx or PDF and re-upload.",
      415,
    );
  }
  if (!SUPPORTED_MIMES.includes(file.type)) {
    return jsonError(`Unsupported type: ${file.type}`, 415);
  }
  if (file.size > MAX_BYTES) return jsonError("File too large (max 10MB)", 413);

  const buffer = await file.arrayBuffer();

  const filePath = `${userId}/${crypto.randomUUID()}-${file.name}`;
  const { error: upErr } = await supabase.storage
    .from("documents")
    .upload(filePath, buffer, { contentType: file.type });
  if (upErr) return jsonError(`Storage failed: ${upErr.message}`, 500);

  const doc = await createDocument({ userId, filename: file.name, filePath });

  try {
    const { chunkCount } = await ingestDocument(doc.id, buffer, file.type);
    return NextResponse.json({
      id: doc.id,
      filename: doc.filename,
      createdAt: (doc.createdAt ?? new Date()).toISOString(),
      status: "ready",
      chunkCount,
    });
  } catch (err) {
    return jsonError(String(err), 500, { id: doc.id, status: "failed" });
  }
}
```

- [ ] **Step 3: Verify build still clean**

Run: `bun run build`
Expected: compiles + type-checks (route no longer references `db`/`documents`).

- [ ] **Step 4: Write the handler tests**

Create `app/api/upload/route.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
const upload = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
    storage: { from: () => ({ upload }) },
  }),
}));
vi.mock("@/lib/ai/extract", () => ({
  SUPPORTED_MIMES: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
  ],
}));
const createDocument = vi.fn();
vi.mock("@/lib/db/documents", () => ({ createDocument: (i: unknown) => createDocument(i) }));
const ingestDocument = vi.fn();
vi.mock("@/lib/rag/ingest", () => ({ ingestDocument: (...a: unknown[]) => ingestDocument(...a) }));

import { POST } from "@/app/api/upload/route";

function reqWith(file: unknown) {
  const form = new FormData();
  if (file) form.append("file", file as Blob);
  return { formData: async () => form } as unknown as Request;
}
const pdf = (name = "a.pdf") =>
  new File([new Uint8Array([1, 2, 3])], name, { type: "application/pdf" });

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  upload.mockResolvedValue({ error: null });
  createDocument.mockResolvedValue({
    id: "doc-1",
    filename: "a.pdf",
    filePath: "user-1/uuid-a.pdf",
    status: "processing",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    userId: "user-1",
  });
  ingestDocument.mockResolvedValue({ chunkCount: 12 });
});

describe("POST /api/upload", () => {
  it("401 when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(reqWith(pdf()))).status).toBe(401);
  });

  it("400 when no file", async () => {
    expect((await POST(reqWith(null))).status).toBe(400);
  });

  it("415 for legacy .doc", async () => {
    const doc = new File(["x"], "a.doc", { type: "application/msword" });
    expect((await POST(reqWith(doc))).status).toBe(415);
  });

  it("415 for unsupported type", async () => {
    const png = new File(["x"], "a.png", { type: "image/png" });
    expect((await POST(reqWith(png))).status).toBe(415);
  });

  it("413 when over 10MB", async () => {
    const big = pdf("big.pdf");
    Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });
    expect((await POST(reqWith(big))).status).toBe(413);
  });

  it("happy path returns the indexed document", async () => {
    const res = await POST(reqWith(pdf()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: "doc-1",
      filename: "a.pdf",
      createdAt: "2026-07-01T00:00:00.000Z",
      status: "ready",
      chunkCount: 12,
    });
    expect(createDocument).toHaveBeenCalledWith({
      userId: "user-1",
      filename: "a.pdf",
      filePath: expect.stringMatching(/^user-1\//),
    });
    expect(ingestDocument).toHaveBeenCalledWith("doc-1", expect.anything(), "application/pdf");
  });

  it("500 when storage upload fails", async () => {
    upload.mockResolvedValue({ error: { message: "boom" } });
    expect((await POST(reqWith(pdf()))).status).toBe(500);
  });

  it("500 with failed status when ingestion throws", async () => {
    ingestDocument.mockRejectedValue(new Error("bad"));
    const res = await POST(reqWith(pdf()));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ id: "doc-1", status: "failed" });
  });
});
```

- [ ] **Step 5: Run — expect PASS**

Run: `bunx vitest run app/api/upload/route.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/db/documents.ts app/api/upload/route.ts app/api/upload/route.test.ts
git commit -m "refactor: extract createDocument; test upload route handler" \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Documents route — extract helpers, adopt `jsonError`, add handler tests

**Files:**
- Modify: `lib/db/documents.ts` (add `listDocumentsWithCounts`, `getOwnedDocument`, `deleteOwnedDocument`)
- Modify: `app/api/documents/route.ts` (use helpers + `jsonError`, drop inline db)
- Test: `app/api/documents/route.test.ts`

**Interfaces:**
- Consumes: `jsonError` (Task 5).
- Produces:
  - `listDocumentsWithCounts(userId: string): Promise<{ id: string; filename: string; status: string | null; createdAt: Date | null; chunkCount: number }[]>`
  - `getOwnedDocument(id: string, userId: string): Promise<{ id: string; filePath: string } | undefined>`
  - `deleteOwnedDocument(id: string, userId: string): Promise<void>`

- [ ] **Step 1: Add the helpers to `lib/db/documents.ts`**

Append:
```ts
import { and, desc, eq, sql } from "drizzle-orm";
import { chunks } from "./schema";

/** A user's documents with per-doc chunk counts, newest first. */
export async function listDocumentsWithCounts(userId: string) {
  return db
    .select({
      id: documents.id,
      filename: documents.filename,
      status: documents.status,
      createdAt: documents.createdAt,
      chunkCount: sql<number>`count(${chunks.id})::int`,
    })
    .from(documents)
    .leftJoin(chunks, eq(chunks.documentId, documents.id))
    .where(eq(documents.userId, userId))
    .groupBy(documents.id)
    .orderBy(desc(documents.createdAt));
}

/** Fetch a document's id + storage path only if it belongs to the user. */
export async function getOwnedDocument(id: string, userId: string) {
  const [doc] = await db
    .select({ id: documents.id, filePath: documents.filePath })
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .limit(1);
  return doc;
}

/** Delete a user's document (chunks cascade via FK). */
export async function deleteOwnedDocument(id: string, userId: string) {
  await db
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));
}
```
(Merge the new `import` lines into the file's existing import block — a single `import { ... } from "drizzle-orm"` and add `chunks` to the `./schema` import.)

- [ ] **Step 2: Refactor the documents route**

Replace `app/api/documents/route.ts` with:
```ts
import {
  deleteOwnedDocument,
  getOwnedDocument,
  listDocumentsWithCounts,
} from "@/lib/db/documents";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/http";
import { Document } from "@/lib/types";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("Unauthorized", 401);

  const rows = await listDocumentsWithCounts(user.id);
  const result: Document[] = rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    status: (r.status ?? "processing") as Document["status"],
    createdAt:
      r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    chunkCount: r.chunkCount ?? 0,
  }));
  return NextResponse.json(result, { status: 200 });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("Unauthorized", 401);

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return jsonError("Missing document id", 400);

  const doc = await getOwnedDocument(id, user.id);
  if (!doc) return jsonError("Document not found", 404);

  const { error: storageErr } = await supabase.storage
    .from("documents")
    .remove([doc.filePath]);
  if (storageErr) console.error("Storage delete failed:", storageErr.message);

  await deleteOwnedDocument(id, user.id);
  return NextResponse.json({ ok: true, id }, { status: 200 });
}
```

- [ ] **Step 3: Verify build still clean**

Run: `bun run build`
Expected: compiles + type-checks.

- [ ] **Step 4: Write the handler tests**

Create `app/api/documents/route.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
const remove = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
    storage: { from: () => ({ remove }) },
  }),
}));
const listDocumentsWithCounts = vi.fn();
const getOwnedDocument = vi.fn();
const deleteOwnedDocument = vi.fn();
vi.mock("@/lib/db/documents", () => ({
  listDocumentsWithCounts: (u: string) => listDocumentsWithCounts(u),
  getOwnedDocument: (i: string, u: string) => getOwnedDocument(i, u),
  deleteOwnedDocument: (i: string, u: string) => deleteOwnedDocument(i, u),
}));

import { GET, DELETE } from "@/app/api/documents/route";

const delReq = (id?: string) =>
  ({ url: `http://localhost/api/documents${id ? `?id=${id}` : ""}` } as unknown as Request);

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  remove.mockResolvedValue({ error: null });
});

describe("GET /api/documents", () => {
  it("401 when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET()).status).toBe(401);
  });

  it("maps rows to the Document shape", async () => {
    listDocumentsWithCounts.mockResolvedValue([
      {
        id: "d1",
        filename: "a.pdf",
        status: "ready",
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
        chunkCount: 3,
      },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      {
        id: "d1",
        filename: "a.pdf",
        status: "ready",
        createdAt: "2026-07-01T00:00:00.000Z",
        chunkCount: 3,
      },
    ]);
  });
});

describe("DELETE /api/documents", () => {
  it("401 when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await DELETE(delReq("d1"))).status).toBe(401);
  });

  it("400 when no id", async () => {
    expect((await DELETE(delReq())).status).toBe(400);
  });

  it("404 when not owned", async () => {
    getOwnedDocument.mockResolvedValue(undefined);
    expect((await DELETE(delReq("d1"))).status).toBe(404);
    expect(deleteOwnedDocument).not.toHaveBeenCalled();
  });

  it("removes storage object + row on success", async () => {
    getOwnedDocument.mockResolvedValue({ id: "d1", filePath: "user-1/x-a.pdf" });
    const res = await DELETE(delReq("d1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, id: "d1" });
    expect(remove).toHaveBeenCalledWith(["user-1/x-a.pdf"]);
    expect(deleteOwnedDocument).toHaveBeenCalledWith("d1", "user-1");
  });
});
```

- [ ] **Step 5: Run — expect PASS**

Run: `bunx vitest run app/api/documents/route.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/db/documents.ts app/api/documents/route.ts app/api/documents/route.test.ts
git commit -m "refactor: extract documents db helpers; test documents route" \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Chat route — export pure helpers, adopt `jsonError`, rename, add tests

**Files:**
- Modify: `app/api/chat/route.ts` (export `buildSystemPrompt`/`toCitations`; `jsonError`; rename `citations864` → `citationsB64`)
- Test: `app/api/chat/route.test.ts`

**Interfaces:**
- Consumes: `jsonError` (Task 5); `retrieveChunks` (existing); `RetrievedChunk` (existing).
- Produces (exported for tests): `buildSystemPrompt(chunks: RetrievedChunk[]): string`, `toCitations(chunks: RetrievedChunk[]): Citation[]`.

- [ ] **Step 1: Edit `app/api/chat/route.ts`**

Make three changes:
1. Add `export` to `buildSystemPrompt` and `toCitations`.
2. Rename `citations864` → `citationsB64` (declaration + use in the `x-citations` header).
3. Replace the two inline error responses with `jsonError` (import it): the 401 branch → `return jsonError("Unauthorized", 401);`, the empty-question branch → `return jsonError("No question provided", 400);`, and the retrieval catch → `return jsonError("Retrieval failed", 500, { detail: String(err) });`. Keep the `createTextStreamResponse({ stream: toTextStream({ stream: result.stream }), headers })` streaming exactly as-is.

Add the import near the top:
```ts
import { jsonError } from "@/lib/http";
```

- [ ] **Step 2: Verify build still clean**

Run: `bun run build`
Expected: compiles + type-checks.

- [ ] **Step 3: Write the tests**

Create `app/api/chat/route.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
const retrieveChunks = vi.fn();
vi.mock("@/lib/rag/retrieve", () => ({ retrieveChunks: (...a: unknown[]) => retrieveChunks(...a) }));
vi.mock("@ai-sdk/google", () => ({ google: () => ({ id: "gemini-2.5-flash" }) }));
vi.mock("ai", () => ({
  streamText: vi.fn(() => ({ stream: {} })),
  toTextStream: vi.fn(() => ({})),
  createTextStreamResponse: vi.fn(
    ({ headers }: { headers: Record<string, string> }) =>
      new Response("streamed", { headers }),
  ),
}));

import { POST, buildSystemPrompt, toCitations } from "@/app/api/chat/route";
import type { RetrievedChunk } from "@/lib/rag/retrieve";

const chunk = (over: Partial<RetrievedChunk> = {}): RetrievedChunk => ({
  id: "c1",
  content: "ctx",
  documentId: "d1",
  filename: "a.pdf",
  page: 2,
  chunkIndex: 0,
  similarity: 0.912345,
  ...over,
});

const jsonReq = (body: unknown) =>
  ({ json: async () => body } as unknown as Request);

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  retrieveChunks.mockResolvedValue([chunk()]);
});

describe("buildSystemPrompt", () => {
  it("guards against answering when there is no context", () => {
    const p = buildSystemPrompt([]);
    expect(p).toMatch(/no relevant context/i);
    expect(p).toMatch(/do not/i);
  });
  it("numbers the context with source + page", () => {
    const p = buildSystemPrompt([chunk()]);
    expect(p).toContain("[1] (source: a.pdf, page 2)");
    expect(p).toContain("ctx");
  });
});

describe("toCitations", () => {
  it("maps chunk fields and rounds similarity to 3dp", () => {
    expect(toCitations([chunk()])).toEqual([
      {
        id: "c1",
        documentId: "d1",
        documentName: "a.pdf",
        content: "ctx",
        similarity: 0.912,
        metadata: { page: 2 },
      },
    ]);
  });
});

describe("POST /api/chat", () => {
  it("401 when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(jsonReq({ question: "hi" }))).status).toBe(401);
  });

  it("400 when question is empty", async () => {
    expect((await POST(jsonReq({ question: "  " }))).status).toBe(400);
  });

  it("500 when retrieval throws", async () => {
    retrieveChunks.mockRejectedValue(new Error("no key"));
    const res = await POST(jsonReq({ question: "hi" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Retrieval failed" });
  });

  it("streams with citations header and scopes retrieval to the user", async () => {
    const res = await POST(jsonReq({ question: "hi", documentId: "d1" }));
    expect(retrieveChunks).toHaveBeenCalledWith("hi", "user-1", {
      documentId: "d1",
      matchCount: 5,
    });
    const header = res.headers.get("x-citations");
    expect(header).toBeTruthy();
    expect(JSON.parse(atob(header!))).toEqual(toCitations([chunk()]));
  });
});
```

- [ ] **Step 4: Run — expect PASS**

Run: `bunx vitest run app/api/chat/route.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Full suite + build green**

Run: `bun run test && bun run build`
Expected: all tests pass; build compiles + type-checks.

- [ ] **Step 6: Commit**

```bash
git add app/api/chat/route.ts app/api/chat/route.test.ts
git commit -m "refactor: export chat helpers, adopt jsonError; test chat route" \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- A. Tooling → Task 1 (vitest + config + scripts + `@/` proven).
- B1. Delete mock path → Task 6.
- B2. Extract db helpers → Tasks 7 (`createDocument`) + 8 (list/get/delete); routes refactored.
- B3. `jsonError` → Task 5 (+ adopted in 7/8/9); rename `citations864` → Task 9; export pure helpers → Task 9.
- C1. Pure unit → Tasks 1 (format), 2 (chunk), 3 (embed), 9 (buildSystemPrompt/toCitations).
- C2. Retrieval scoping → Task 4 (mapping/wiring) + Task 9 (route passes `user.id`), with the integration caveat noted in Task 4.
- C3. Route handlers → Tasks 7 (upload), 8 (documents), 9 (chat).
- Verification bullets → covered by the per-task `bun run build`/`bun run test` steps and Task 6's grep.

**Placeholder scan:** none — every code and command step is concrete.

**Type consistency:** `createDocument`/`listDocumentsWithCounts`/`getOwnedDocument`/`deleteOwnedDocument` signatures in Tasks 7–8 match their mocked uses in the route tests; `RetrievedChunk` shape used in Tasks 4 and 9 matches `lib/rag/retrieve.ts`; `jsonError(message, status, extra?)` used identically in Tasks 5/7/8/9; `Citation` shape in `toCitations` matches `lib/types.ts`.
