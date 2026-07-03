"use client";

import * as React from "react";
import { toast } from "sonner";
import { FolderOpen } from "lucide-react";
import { UploadZone } from "./upload-zone";
import { DocumentCard } from "./document-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteDocument,
  listDocuments,
  uploadDocument,
  UploadError,
} from "@/lib/data/client";
import type { Document } from "@/lib/types";

export function LibraryView() {
  const [docs, setDocs] = React.useState<Document[] | null>(null);

  React.useEffect(() => {
    let alive = true;
    listDocuments()
      .then((d) => alive && setDocs(d))
      .catch((err: unknown) => {
        if (!alive) return;
        setDocs([]);
        toast.error("Belgeler yüklenemedi", {
          description: err instanceof Error ? err.message : undefined,
        });
      });
    return () => {
      alive = false;
    };
  }, []);

  function handleUpload(files: File[]) {
    files.forEach(async (file) => {
      // Optimistic "processing" row while the server extracts → embeds → stores.
      // The real /api/upload awaits ingestion and returns the finished document.
      const tempId = `temp_${crypto.randomUUID()}`;
      setDocs((prev) => [
        {
          id: tempId,
          filename: file.name,
          status: "processing",
          createdAt: new Date().toISOString(),
          size: file.size,
        },
        ...(prev ?? []),
      ]);

      try {
        const doc = await uploadDocument(file);
        setDocs((prev) =>
          (prev ?? []).map((d) => (d.id === tempId ? doc : d)),
        );
        toast.success(`${file.name} dizine eklendi`, {
          description: "Sohbette sorgulanmaya hazır.",
        });
      } catch (err) {
        // Ingestion failures leave a real row behind (status "failed") — adopt its
        // id so the visible card can actually be deleted.
        const realId =
          err instanceof UploadError && err.documentId ? err.documentId : null;
        setDocs((prev) =>
          (prev ?? []).map((d) =>
            d.id === tempId
              ? { ...d, id: realId ?? tempId, status: "failed" }
              : d,
          ),
        );
        toast.error(`${file.name} yüklenemedi`, {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    });
  }

  async function handleDelete(id: string) {
    const removed = docs?.find((d) => d.id === id);
    setDocs((prev) => prev?.filter((d) => d.id !== id) ?? null);
    try {
      await deleteDocument(id);
      toast.success(`Silindi: ${removed?.filename ?? "belge"}`);
    } catch (err) {
      toast.error("Silme başarısız oldu", {
        description: err instanceof Error ? err.message : undefined,
      });
      if (removed) setDocs((prev) => [removed, ...(prev ?? [])]);
    }
  }

  const total = docs?.length ?? 0;
  const ready = docs?.filter((d) => d.status === "ready").length ?? 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
        {/* Page header */}
        <header className="animate-rise">
          <p className="label text-ink-40">Çalışma alanı</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Kitaplık
          </h1>
          <p className="label mt-3 text-ink-60">
            {docs === null
              ? "Yükleniyor…"
              : `${total} belge · ${ready} sorgulanmaya hazır`}
          </p>
        </header>

        <div className="mt-7 animate-rise" style={{ animationDelay: "60ms" }}>
          <UploadZone onUpload={handleUpload} />
        </div>

        {/* Section divider */}
        <div className="mb-4 mt-10 flex items-center gap-4">
          <span className="label text-ink">Belgeler</span>
          <span className="h-px flex-1 animate-rule bg-rule" />
          <span className="label text-ink-40">{total}</span>
        </div>

        {docs === null ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-30 w-full border border-rule" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-ink bg-paper-2 px-6 py-16 text-center">
            <span className="grid size-12 place-items-center border border-ink bg-paper text-ink">
              <FolderOpen className="size-5" />
            </span>
            <p className="font-mono text-sm font-medium uppercase tracking-[0.08em]">
              Henüz belge yok
            </p>
            <p className="reading max-w-sm text-sm text-ink-60">
              Dizine eklemek için yukarıdan bir dosya yükleyin. Hazır olduğunda
              sohbete geçip soru sormaya başlayabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {docs.map((doc, i) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onDelete={handleDelete}
                style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
