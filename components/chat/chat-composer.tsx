"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatComposer({
  onSubmit,
  disabled,
}: {
  onSubmit: (q: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = React.useState("");

  function submit() {
    const q = value.trim();
    if (!q || disabled) return;
    onSubmit(q);
    setValue("");
  }

  return (
    <div className="shrink-0 border-t border-ink bg-paper">
      <div className="mx-auto w-full max-w-3xl px-5 py-3 sm:px-8">
        <div className="flex items-end gap-2">
          <Textarea
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Ask anything about your documents…"
            className="max-h-40 min-h-11 flex-1"
            disabled={disabled}
          />
          <Button
            variant="accent"
            size="lg"
            onClick={submit}
            disabled={disabled || value.trim() === ""}
            className="h-11 shrink-0"
          >
            Ask
            <ArrowRight className="size-4" />
          </Button>
        </div>
        <p className="label mt-2 text-ink-40">
          Enter to send · Shift + Enter for a new line
        </p>
      </div>
    </div>
  );
}
