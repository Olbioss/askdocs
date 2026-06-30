import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-20 w-full resize-none border border-ink bg-paper px-3 py-2.5 font-mono text-sm leading-relaxed text-ink transition-shadow placeholder:text-ink-40 focus-visible:border-accent focus-visible:shadow-hard-sm focus-visible:outline-none disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
