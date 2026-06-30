"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-start gap-3 border border-ink bg-paper p-3 font-mono text-xs text-ink shadow-hard-sm",
          title: "text-xs font-semibold uppercase tracking-[0.08em]",
          description:
            "mt-0.5 text-[0.6875rem] normal-case tracking-normal text-ink-60",
          actionButton:
            "border border-ink bg-ink px-2 py-1 text-[0.625rem] uppercase text-paper",
          cancelButton: "border border-ink px-2 py-1 text-[0.625rem] uppercase",
          icon: "mt-0.5",
        },
      }}
      style={{ ["--width" as string]: "22rem" }}
      {...props}
    />
  );
}

export { Toaster };
