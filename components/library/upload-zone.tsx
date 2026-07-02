"use client";

import * as React from "react";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Pre-flight courtesy checks only — the server (app/api/upload) stays authoritative.
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPT_EXT = [".pdf", ".docx", ".txt", ".md", ".markdown"];

export function UploadZone({
  onUpload,
}: {
  onUpload: (files: File[]) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);

  function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (!ACCEPT_EXT.includes(ext)) {
        toast.error(`Can't upload ${file.name}`, {
          description:
            ext === ".doc"
              ? "Legacy .doc isn't supported — save as .docx or PDF."
              : "Only PDF, DOCX, TXT and Markdown are supported.",
        });
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`Can't upload ${file.name}`, {
          description: "Files can be at most 10 MB.",
        });
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length > 0) onUpload(accepted);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDrag(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handleFiles(e.dataTransfer.files);
      }}
      role="region"
      aria-label="Upload documents"
      className={cn(
        "relative flex flex-col items-center justify-center gap-4 border-2 border-dashed px-6 py-10 text-center transition-[background-color,border-color,box-shadow]",
        drag
          ? "border-solid border-accent bg-paper-2 shadow-hard-sm"
          : "border-ink bg-paper",
      )}
    >
      <span
        className={cn(
          "grid size-12 place-items-center border border-ink transition-colors",
          drag ? "bg-accent text-accent-ink" : "bg-paper text-ink",
        )}
      >
        <UploadCloud className="size-5" />
      </span>
      <div>
        <p className="font-mono text-sm font-medium uppercase tracking-[0.08em] text-ink">
          Drop documents to upload
        </p>
        <p className="reading mx-auto mt-1.5 max-w-sm text-sm text-ink-60">
          PDF, DOCX, TXT or Markdown — up to 10 MB each. Drag them here, or
          browse from your device.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        Browse files
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.md,.markdown"
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
