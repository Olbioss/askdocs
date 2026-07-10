"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FileText, MessageSquareText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "./status-badge";
import { fileExt, formatBytes, relativeTime } from "@/lib/format";
import type { Locale } from "@/i18n/routing";
import type { Document } from "@/lib/types";

export function DocumentCard({
  doc,
  onDelete,
  style,
}: {
  doc: Document;
  onDelete: (id: string) => void;
  style?: React.CSSProperties;
}) {
  const t = useTranslations("DocumentCard");
  const locale = useLocale() as Locale;
  const [open, setOpen] = React.useState(false);

  const meta = [
    relativeTime(doc.createdAt, locale),
    doc.pages ? t("pages", { count: doc.pages }) : null,
    doc.chunkCount ? t("chunks", { count: doc.chunkCount }) : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div
      style={style}
      className="animate-rise group flex flex-col justify-between border border-ink bg-paper p-4 transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-hard-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center border border-ink bg-paper-2 text-ink">
            <FileText className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-mono text-sm text-ink" title={doc.filename}>
              {doc.filename}
            </p>
            <p className="label mt-1 text-ink-40">
              {fileExt(doc.filename)} · {formatBytes(doc.size)}
            </p>
          </div>
        </div>
        <StatusBadge status={doc.status} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <span className="label truncate text-ink-60">{meta || "—"}</span>
        <div className="-mr-1 flex shrink-0 items-center gap-0.5">
          {doc.status === "ready" && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2"
            >
              <Link
                href={`/chat?doc=${doc.id}`}
                aria-label={t("askAbout", { name: doc.filename })}
              >
                <MessageSquareText className="size-3.5" />
                {t("ask")}
              </Link>
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={t("deleteAria", { name: doc.filename })}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("deleteTitle")}</DialogTitle>
                <DialogDescription>
                  {t.rich("deleteBody", {
                    name: doc.filename,
                    n: (chunks) => (
                      <span className="font-mono text-ink">{chunks}</span>
                    ),
                  })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" size="sm">
                    {t("cancel")}
                  </Button>
                </DialogClose>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    onDelete(doc.id);
                  }}
                >
                  {t("delete")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
