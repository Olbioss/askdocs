import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-paper px-6 text-center">
      <p className="font-mono text-7xl font-bold tracking-tight text-accent">
        404
      </p>
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">
        Bu sayfa kitaplıkta yok.
      </h1>
      <p className="reading max-w-md text-sm text-ink-60">
        Adres yanlış yazılmış ya da sayfa taşınmış olabilir.
      </p>
      <Button variant="outline" asChild>
        <Link href="/">Ana sayfaya dön</Link>
      </Button>
    </div>
  );
}
