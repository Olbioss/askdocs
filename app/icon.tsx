import { ImageResponse } from "next/og";

// Favicon: the Logo component's mark (components/logo.tsx) — a vermilion
// square with a bold "A" — rendered at tab size.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#e5341f",
          border: "2px solid #0c0c0c",
          color: "#f7f4ec",
          fontSize: 22,
          fontWeight: 800,
        }}
      >
        A
      </div>
    ),
    { ...size },
  );
}
