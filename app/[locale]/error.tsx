"use client";

import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useTranslations("ErrorPage");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-paper px-6 text-center">
      <p className="label text-accent">{t("label")}</p>
      <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
        {t("title")}
      </h1>
      <p className="reading max-w-md text-sm text-ink-60">{t("body")}</p>
      {error.digest && <p className="label text-ink-40">ref {error.digest}</p>}
      <Button variant="accent" onClick={() => unstable_retry()}>
        <RotateCcw className="size-4" />
        {t("retry")}
      </Button>
    </div>
  );
}
