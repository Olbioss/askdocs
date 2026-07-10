"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("ScopeSelect");
  const current = documents.find((d) => d.id === value);
  const label = current ? current.filename : t("all");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-9 max-w-[14rem] items-center gap-2 border border-ink bg-paper px-3 font-mono text-xs uppercase tracking-[0.06em] text-ink transition-colors hover:bg-paper-2 focus-visible:outline-none data-[state=open]:shadow-hard-sm sm:max-w-[18rem]"
        aria-label={t("aria")}
      >
        <Database className="size-3.5 shrink-0" />
        <span className="truncate normal-case tracking-normal">{label}</span>
        <ChevronDown className="ml-auto size-3.5 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-w-[20rem]">
        <DropdownMenuLabel>{t("scopeLabel")}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onChange(null)}>
          {t("all")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {documents.length === 0 ? (
          <DropdownMenuItem disabled className="normal-case tracking-normal">
            {t("none")}
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
