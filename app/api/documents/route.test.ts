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
