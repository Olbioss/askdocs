import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  MessageSquareText,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

function Sup({ n }: { n: number }) {
  return (
    <sup className="ml-0.5 font-mono text-[0.7em] font-semibold text-accent">
      [{n}]
    </sup>
  );
}

function PreviewSource({
  n,
  name,
  loc,
  score,
}: {
  n: number;
  name: string;
  loc: string;
  score: number;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className="grid size-5 shrink-0 place-items-center border border-accent font-mono text-[0.625rem] font-semibold text-accent">
        {n}
      </span>
      <span className="truncate font-mono text-[0.6875rem] text-ink">
        {name}
      </span>
      <span className="label shrink-0 text-ink-40">{loc}</span>
      <div className="ml-auto flex w-24 shrink-0 items-center gap-2">
        <div className="h-1.5 flex-1 border border-ink bg-paper">
          <div
            className="h-full bg-accent"
            style={{ width: `${score * 100}%` }}
          />
        </div>
        <span className="font-mono text-[0.625rem] font-semibold text-ink">
          {score.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="w-full border border-ink bg-paper shadow-hard">
      <div className="flex items-center justify-between border-b border-ink px-4 py-2.5">
        <span className="label inline-flex items-center gap-1.5">
          <span className="size-2 bg-accent" />
          Cevap
        </span>
        <span className="label text-ink-40">2 kaynak</span>
      </div>
      <div className="px-5 py-5">
        <p className="label text-ink-40">S · Tasfiye önceliğimiz nedir?</p>
        <p className="reading mt-3 text-[0.95rem] text-ink">
          Yatırımcılar, adi pay sahiplerinden önce ödenen{" "}
          <span className="font-semibold">1× katılımsız</span> tasfiye
          önceliğine sahip
          <Sup n={1} />. Dönem sözleşmesinde full-ratchet anti-dilüsyon koruması
          yok
          <Sup n={2} />.
        </p>
      </div>
      <div className="divide-y divide-rule border-t border-ink">
        <PreviewSource
          n={1}
          name="Seri-A-Donem-Sozlesmesi.pdf"
          loc="s.3"
          score={0.92}
        />
        <PreviewSource
          n={2}
          name="Seri-A-Donem-Sozlesmesi.pdf"
          loc="s.4"
          score={0.86}
        />
      </div>
    </div>
  );
}

const MARQUEE = [
  "Kaynaklı cevaplar",
  "PDF",
  "DOCX",
  "Markdown",
  "Sözleşmeler",
  "Yönetim notları",
  "Araştırma notları",
  "Benzerlik puanı",
  "pgvector",
  "Gemini 2.5 Flash",
];

function Step({
  n,
  title,
  body,
  icon: Icon,
}: {
  n: string;
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="group border-b border-ink p-8 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <div className="flex items-center justify-between">
        <span className="font-mono text-3xl font-semibold text-ink">{n}</span>
        <span className="grid size-9 place-items-center border border-ink text-ink transition-colors group-hover:bg-accent group-hover:text-accent-ink">
          <Icon className="size-4" />
        </span>
      </div>
      <h3 className="mt-6 font-serif text-2xl font-semibold tracking-tight text-ink">
        {title}
      </h3>
      <p className="reading mt-2 text-sm text-ink-60">{body}</p>
    </div>
  );
}

export default async function LandingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthed = !!data?.claims;

  return (
    <>
      {/* Hero */}
      <section className="border-b border-ink">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-24">
          <div className="flex flex-col justify-center">
            <p className="label inline-flex animate-rise items-center gap-2 text-ink-60">
              <span className="size-2 bg-accent" />
              Kaynaklı Soru-Cevap
            </p>
            <h1 className="mt-5 font-serif text-5xl font-semibold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              <span
                className="block animate-rise"
                style={{ animationDelay: "40ms" }}
              >
                Belgelerinize
              </span>
              <span
                className="block animate-rise"
                style={{ animationDelay: "110ms" }}
              >
                sorun.
              </span>
              <span
                className="block animate-rise italic text-accent"
                style={{ animationDelay: "180ms" }}
              >
                Kanıtını alın.
              </span>
            </h1>
            <p
              className="reading mt-6 max-w-md animate-rise text-lg text-ink-70"
              style={{ animationDelay: "260ms" }}
            >
              Sözleşmelerinizi, notlarınızı ve araştırmalarınızı yükleyin.
              Sorunuzu doğal dille sorun. Her cevap, dayandığı pasajlara ve
              denetleyebileceğiniz benzerlik puanlarına bağlı olarak gelir.
            </p>
            <div
              className="mt-8 flex animate-rise flex-wrap items-center gap-3"
              style={{ animationDelay: "340ms" }}
            >
              {isAuthed ? (
                <>
                  <Button asChild variant="accent" size="lg">
                    <Link href="/library">
                      Çalışma alanını aç
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/chat">Soru sor</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="accent" size="lg">
                    <Link href="/signup">
                      Hemen başla
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/library">Çalışma alanını aç</Link>
                  </Button>
                </>
              )}
            </div>
            <p
              className="label mt-6 animate-rise text-ink-40"
              style={{ animationDelay: "400ms" }}
            >
              {isAuthed
                ? "Oturum açık · Kaldığınız yerden devam edin"
                : "Kredi kartı yok · Ücretsiz · PDF · DOCX · Markdown"}
            </p>
          </div>

          <div
            className="flex animate-rise items-center"
            style={{ animationDelay: "220ms" }}
          >
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* Marquee */}
      <section className="overflow-hidden border-b border-ink bg-ink py-3">
        <div className="marquee-track flex w-max">
          {[0, 1].map((half) => (
            <div
              key={half}
              className="flex shrink-0 items-center"
              aria-hidden={half === 1}
            >
              {MARQUEE.map((item) => (
                <span
                  key={`${half}-${item}`}
                  className="label flex items-center px-6 text-paper/80"
                >
                  <span className="mr-6 size-1.5 bg-accent" />
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="flex items-center gap-4">
          <span className="label text-ink">Nasıl çalışır</span>
          <span className="h-px flex-1 bg-rule" />
        </div>
        <div className="mt-8 grid border border-ink md:grid-cols-3">
          <Step
            n="01"
            title="Yükle"
            icon={Upload}
            body="PDF, DOCX veya Markdown bırakın. Metni çıkarır, parçalara böler ve pgvector dizinine gömeriz."
          />
          <Step
            n="02"
            title="Sor"
            icon={MessageSquareText}
            body="Sorunuzu doğal dille sorun. En yakın pasajları bulur, Gemini 2.5 Flash ile cevaplarız."
          />
          <Step
            n="03"
            title="Doğrula"
            icon={BadgeCheck}
            body="Her iddia, kaynak pasajına ve benzerlik puanına bağlanır. Güven, ama doğrula."
          />
        </div>
      </section>

      {/* CTA band */}
      <section className="border-y border-ink bg-accent text-accent-ink">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-5 py-14 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <h2 className="max-w-lg font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Belgelerinizi işe koşun.
          </h2>
          <Button asChild variant="default" size="lg">
            <Link href={isAuthed ? "/library" : "/signup"}>
              {isAuthed ? "Çalışma alanını aç" : "Hemen başla"}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
