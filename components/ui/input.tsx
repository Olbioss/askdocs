import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full border border-ink bg-paper px-3 py-2 font-mono text-sm text-ink transition-shadow placeholder:text-ink-40 focus-visible:border-accent focus-visible:shadow-hard-sm focus-visible:outline-none disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
