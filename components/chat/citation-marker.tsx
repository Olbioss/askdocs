"use client";

export function CitationMarker({
  n,
  onClick,
}: {
  n: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Source ${n}`}
      className="align-super font-mono text-[0.7em] font-semibold text-accent underline-offset-2 transition-colors hover:underline disabled:no-underline"
      disabled={!onClick}
    >
      [{n}]
    </button>
  );
}
