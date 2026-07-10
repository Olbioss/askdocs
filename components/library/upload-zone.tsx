"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("UploadZone");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);

  function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (!ACCEPT_EXT.includes(ext)) {
        toast.error(t("cantUpload", { name: file.name }), {
          description: ext === ".doc" ? t("legacyDoc") : t("onlyFormats"),
        });
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(t("cantUpload", { name: file.name }), {
          description: t("tooLarge"),
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
      aria-label={t("region")}
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
          {t("dropTitle")}
        </p>
        <p className="reading mx-auto mt-1.5 max-w-sm text-sm text-ink-60">
          {t("dropBody")}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        {t("chooseFile")}
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
