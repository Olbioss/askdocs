import { ImageResponse } from "next/og";
import { isLocale, routing } from "@/i18n/routing";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";

// Social-share card in the app's brutalist system: warm paper, hard ink
// edges, one phthalo-green accent (see app/globals.css tokens).
// `alt` is a static export and can't react to the locale — keep it English.
export const alt = "AskDocs — Ask your documents, get cited answers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MESSAGES = { en, tr } as const;

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const m =
    MESSAGES[isLocale(locale) ? locale : routing.defaultLocale].OgImage;

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
          <div style={{ width: 30, height: 30, backgroundColor: "#0e7a4e" }} />
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
          {m.headline}
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
          <div style={{ display: "flex" }}>{m.footer}</div>
          <div
            style={{ width: 220, height: 12, backgroundColor: "#0e7a4e" }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
