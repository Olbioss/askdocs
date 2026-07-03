"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-paper px-6 text-center">
      <p className="label text-accent">Hata</p>
      <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
        Bir şeyler ters gitti.
      </h1>
      <p className="reading max-w-md text-sm text-ink-60">
        Beklenmedik bir hata sayfayı kesintiye uğrattı. Belgeleriniz güvende —
        tekrar deneyin.
      </p>
      {error.digest && <p className="label text-ink-40">ref {error.digest}</p>}
      <Button variant="accent" onClick={() => unstable_retry()}>
        <RotateCcw className="size-4" />
        Tekrar dene
      </Button>
    </div>
  );
}
