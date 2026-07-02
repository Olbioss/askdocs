"use client";

import { ChevronDown, Database } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Document } from "@/lib/types";

export function ScopeSelect({
  documents,
  value,
  onChange,
}: {
  documents: Document[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const current = documents.find((d) => d.id === value);
  const label = current ? current.filename : "All sources";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-9 max-w-[14rem] items-center gap-2 border border-ink bg-paper px-3 font-mono text-xs uppercase tracking-[0.06em] text-ink transition-colors hover:bg-paper-2 focus-visible:outline-none data-[state=open]:shadow-hard-sm sm:max-w-[18rem]"
        aria-label="Choose which documents to search"
      >
        <Database className="size-3.5 shrink-0" />
        <span className="truncate normal-case tracking-normal">{label}</span>
        <ChevronDown className="ml-auto size-3.5 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-w-[20rem]">
        <DropdownMenuLabel>Search scope</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onChange(null)}>
          All sources
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {documents.length === 0 ? (
          <DropdownMenuItem disabled className="normal-case tracking-normal">
            No sources yet — upload in Library
          </DropdownMenuItem>
        ) : (
          documents.map((d) => (
            <DropdownMenuItem
              key={d.id}
              onSelect={() => onChange(d.id)}
              className="normal-case tracking-normal"
            >
              <span className="truncate">{d.filename}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
