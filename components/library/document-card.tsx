"use client";

import * as React from "react";
import Link from "next/link";
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
  const [open, setOpen] = React.useState(false);

  const meta = [
    relativeTime(doc.createdAt),
    doc.pages ? `${doc.pages} pp` : null,
    doc.chunkCount ? `${doc.chunkCount} chunks` : null,
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
              <Link href={`/chat?doc=${doc.id}`}>
                <MessageSquareText className="size-3.5" />
                Ask
              </Link>
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Delete ${doc.filename}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete document</DialogTitle>
                <DialogDescription>
                  This permanently removes{" "}
                  <span className="font-mono text-ink">{doc.filename}</span> and
                  all of its indexed chunks. This can&rsquo;t be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" size="sm">
                    Cancel
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
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
