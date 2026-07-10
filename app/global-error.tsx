"use client";

// Last-resort boundary above the [locale] layout — renders its own <html>,
// so copy stays hardcoded English and styling is inline.
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f3f0e8",
          color: "#0c0c0c",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Something went wrong
          </p>
          <button
            onClick={reset}
            style={{
              border: "1px solid #0c0c0c",
              background: "#0e7a4e",
              color: "#f7f4ec",
              padding: "8px 16px",
              font: "inherit",
              cursor: "pointer",
              boxShadow: "3px 3px 0 0 #0c0c0c",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
