import { SUPPORTED_MIMES } from "@/lib/ai/extract";
import { createDocument } from "@/lib/db/documents";
import { IngestError, ingestDocument } from "@/lib/rag/ingest";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/http";
import { resolveLocale } from "@/lib/i18n/get-locale";
import { apiMessages, fmt } from "@/lib/i18n/api-messages";
import { NextResponse } from "next/server";

const UPLOADS_PER_HOUR = 20;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Ingestion runs inline (extract → OCR fallback for scans → embed → store);
// Gemini transcription of a multi-page scan can take minutes, so use the full
// Fluid Compute allowance.
export const maxDuration = 300;

/**
 * Storage object keys choke on exotic characters and unbounded length; the
 * original filename stays untouched in the DB row.
 */
export function sanitizeForStoragePath(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  const clean = (s: string) => s.replace(/[^A-Za-z0-9._-]+/g, "_");
  return clean(base).slice(0, 100) + clean(ext);
}

export async function POST(req: Request) {
  const locale = resolveLocale(req);
  const m = apiMessages(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError(m.unauthorized, 401);
  const userId = user.id;

  if (!(await checkRateLimit(userId, "upload", UPLOADS_PER_HOUR, 3_600_000))) {
    return jsonError(
      fmt(m.upload.rateLimited, { limit: UPLOADS_PER_HOUR }),
      429,
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError(m.upload.noFile, 400);

  // Friendly rejection for legacy .doc — MUST come before the SUPPORTED_MIMES allow-list below, or the bland "Unsupported type" 415 wins.
  if (file.type === "application/msword") {
    return jsonError(m.upload.legacyDoc, 415);
  }
  if (!SUPPORTED_MIMES.includes(file.type)) {
    return jsonError(fmt(m.upload.unsupportedType, { type: file.type }), 415);
  }
  // Check size BEFORE reading the file into memory — File.size needs no read.
  if (file.size > MAX_BYTES) return jsonError(m.upload.tooLarge, 413);

  const buffer = await file.arrayBuffer();

  const filePath = `${userId}/${crypto.randomUUID()}-${sanitizeForStoragePath(file.name)}`;
  const { error: upErr } = await supabase.storage
    .from("documents")
    .upload(filePath, buffer, { contentType: file.type });
  if (upErr)
    return jsonError(fmt(m.upload.storeFailed, { message: upErr.message }), 500);

  let doc;
  try {
    doc = await createDocument({ userId, filename: file.name, filePath });
  } catch (err) {
    // don't orphan the stored object when no row references it
    await supabase.storage.from("documents").remove([filePath]);
    return jsonError(fmt(m.upload.saveFailed, { message: String(err) }), 500);
  }

  // Ingestion is awaited for MVP simplicity; move to a background job once large files approach the serverless timeout.
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
    // Known ingest failures carry a code → localized message; anything else
    // uses err.message, not String(err) — the "Error: " prefix would leak
    // into toasts.
    const message =
      err instanceof IngestError
        ? err.code === "no_text"
          ? m.upload.noText
          : m.upload.processFailed
        : err instanceof Error
          ? err.message
          : String(err);
    return jsonError(message, 500, { id: doc.id, status: "failed" });
  }
}
