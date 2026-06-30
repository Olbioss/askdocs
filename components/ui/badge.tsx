import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[0.625rem] font-medium uppercase leading-none tracking-[0.1em]",
  {
    variants: {
      variant: {
        default: "border-ink bg-transparent text-ink",
        solid: "border-ink bg-ink text-paper",
        accent: "border-ink bg-accent text-accent-ink",
        muted: "border-rule bg-paper-2 text-ink-60",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
