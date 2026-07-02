import { afterEach, describe, expect, it, vi } from "vitest";
import {
  askQuestion,
  deleteDocument,
  listDocuments,
  uploadDocument,
  UploadError,
} from "@/lib/data/client";

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function stubFetch(res: Response) {
  const fn = vi.fn(async () => res);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listDocuments", () => {
  it("returns the documents on success", async () => {
    const docs = [{ id: "d1", filename: "a.pdf", status: "ready", createdAt: "2026-07-01T00:00:00.000Z" }];
    stubFetch(jsonRes(docs));
    expect(await listDocuments()).toEqual(docs);
  });

  it("throws the server's error message on failure", async () => {
    stubFetch(jsonRes({ error: "Unauthorized" }, 401));
    await expect(listDocuments()).rejects.toThrow("Unauthorized");
  });

  it("falls back to a generic message when the error body isn't JSON", async () => {
    stubFetch(new Response("boom", { status: 500 }));
    await expect(listDocuments()).rejects.toThrow("Failed to load documents");
  });
});

describe("uploadDocument", () => {
  const file = new File(["hello"], "a.pdf", { type: "application/pdf" });

  it("returns the created document", async () => {
    const doc = { id: "d1", filename: "a.pdf", status: "ready", createdAt: "2026-07-01T00:00:00.000Z", chunkCount: 2 };
    stubFetch(jsonRes(doc));
    expect(await uploadDocument(file)).toEqual(doc);
  });

  it("throws an UploadError carrying the server message and document id", async () => {
    stubFetch(jsonRes({ error: "Error: No extractable text found", id: "doc-9", status: "failed" }, 500));
    const err = await uploadDocument(file).catch((e) => e);
    expect(err).toBeInstanceOf(UploadError);
    expect(err.message).toBe("Error: No extractable text found");
    expect(err.documentId).toBe("doc-9");
    expect(err.status).toBe("failed");
  });

  it("throws an UploadError with a fallback message when the body isn't JSON", async () => {
    stubFetch(new Response("boom", { status: 502 }));
    const err = await uploadDocument(file).catch((e) => e);
    expect(err).toBeInstanceOf(UploadError);
    expect(err.message).toBe("Upload failed");
    expect(err.documentId).toBeUndefined();
  });
});

describe("deleteDocument", () => {
  it("throws the server's error message on failure", async () => {
    stubFetch(jsonRes({ error: "Document not found" }, 404));
    await expect(deleteDocument("d1")).rejects.toThrow("Document not found");
  });
});

describe("askQuestion", () => {
  it("throws the server's error message on a non-ok response", async () => {
    stubFetch(jsonRes({ error: "Retrieval failed" }, 500));
    const gen = askQuestion({ question: "hi" });
    await expect(gen.next()).rejects.toThrow("Retrieval failed");
  });
});
