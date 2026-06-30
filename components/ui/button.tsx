import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap border font-mono text-xs font-medium uppercase tracking-[0.08em] transition-[transform,box-shadow,background-color,color,border-color] duration-100 ease-out disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        accent:
          "border-ink bg-accent text-accent-ink shadow-hard-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-hard active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        default:
          "border-ink bg-paper text-ink shadow-hard-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-hard active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        outline: "border-ink bg-transparent text-ink hover:bg-ink hover:text-paper",
        ghost:
          "border-transparent bg-transparent text-ink hover:border-ink hover:bg-paper-2",
        link: "border-transparent bg-transparent p-0 text-ink underline decoration-1 underline-offset-4 hover:text-accent",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-[0.6875rem]",
        lg: "h-12 px-6 text-sm",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

export { Button, buttonVariants };
