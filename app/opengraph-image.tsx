import { ImageResponse } from "next/og";

// Social-share card in the app's brutalist system: warm paper, hard ink
// edges, one vermilion accent (see app/globals.css tokens).
export const alt = "AskDocs — belgelerinize sorun, kanıtlı cevaplar alın";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#f3f0e8",
          padding: "64px 72px",
          fontFamily: "monospace",
          border: "16px solid #0c0c0c",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 30, height: 30, backgroundColor: "#e5341f" }} />
          <div style={{ fontSize: 34, letterSpacing: 8, color: "#0c0c0c" }}>
            ASKDOCS
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 78,
            fontWeight: 700,
            color: "#0c0c0c",
            lineHeight: 1.08,
            letterSpacing: -2,
          }}
        >
          Belgelerinize sorun. Kanıtlı cevaplar alın.
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            color: "rgba(12, 12, 12, 0.6)",
            letterSpacing: 2,
          }}
        >
          <div style={{ display: "flex" }}>RAG · KAYNAKLI CEVAPLAR · PGVECTOR</div>
          <div
            style={{ width: 220, height: 12, backgroundColor: "#e5341f" }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
