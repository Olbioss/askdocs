import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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
  const t = useTranslations("Marketing");
  return (
    <div className="w-full border border-ink bg-paper shadow-hard">
      <div className="flex items-center justify-between border-b border-ink px-4 py-2.5">
        <span className="label inline-flex items-center gap-1.5">
          <span className="size-2 bg-accent" />
          {t("previewAnswer")}
        </span>
        <span className="label text-ink-40">{t("previewSources")}</span>
      </div>
      <div className="px-5 py-5">
        <p className="label text-ink-40">{t("previewQuestion")}</p>
        <p className="reading mt-3 text-[0.95rem] text-ink">
          {t.rich("previewBody", {
            b: (chunks) => <span className="font-semibold">{chunks}</span>,
            s1: () => <Sup n={1} />,
            s2: () => <Sup n={2} />,
          })}
        </p>
      </div>
      <div className="divide-y divide-rule border-t border-ink">
        <PreviewSource
          n={1}
          name={t("previewFile")}
          loc={t("previewLoc1")}
          score={0.92}
        />
        <PreviewSource
          n={2}
          name={t("previewFile")}
          loc={t("previewLoc2")}
          score={0.86}
        />
      </div>
    </div>
  );
}

function Marquee() {
  const t = useTranslations("Marketing");
  const items = t.raw("marquee") as string[];
  return (
    <section className="overflow-hidden border-b border-ink bg-ink py-3">
      <div className="marquee-track flex w-max">
        {[0, 1].map((half) => (
          <div
            key={half}
            className="flex shrink-0 items-center"
            aria-hidden={half === 1}
          >
            {items.map((item) => (
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
  );
}

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
  const t = await getTranslations("Marketing");
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
              {t("badge")}
            </p>
            <h1 className="mt-5 font-serif text-5xl font-semibold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              <span
                className="block animate-rise"
                style={{ animationDelay: "40ms" }}
              >
                {t("headline1")}
              </span>
              <span
                className="block animate-rise"
                style={{ animationDelay: "110ms" }}
              >
                {t("headline2")}
              </span>
              <span
                className="block animate-rise italic text-accent"
                style={{ animationDelay: "180ms" }}
              >
                {t("headline3")}
              </span>
            </h1>
            <p
              className="reading mt-6 max-w-md animate-rise text-lg text-ink-70"
              style={{ animationDelay: "260ms" }}
            >
              {t("heroBody")}
            </p>
            <div
              className="mt-8 flex animate-rise flex-wrap items-center gap-3"
              style={{ animationDelay: "340ms" }}
            >
              {isAuthed ? (
                <>
                  <Button asChild variant="accent" size="lg">
                    <Link href="/library">
                      {t("openWorkspace")}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/chat">{t("askQuestion")}</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="accent" size="lg">
                    <Link href="/signup">
                      {t("getStarted")}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/library">{t("openWorkspace")}</Link>
                  </Button>
                </>
              )}
            </div>
            <p
              className="label mt-6 animate-rise text-ink-40"
              style={{ animationDelay: "400ms" }}
            >
              {isAuthed ? t("signedInNote") : t("signedOutNote")}
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
      <Marquee />

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="flex items-center gap-4">
          <span className="label text-ink">{t("howItWorks")}</span>
          <span className="h-px flex-1 bg-rule" />
        </div>
        <div className="mt-8 grid border border-ink md:grid-cols-3">
          <Step
            n="01"
            title={t("step1Title")}
            icon={Upload}
            body={t("step1Body")}
          />
          <Step
            n="02"
            title={t("step2Title")}
            icon={MessageSquareText}
            body={t("step2Body")}
          />
          <Step
            n="03"
            title={t("step3Title")}
            icon={BadgeCheck}
            body={t("step3Body")}
          />
        </div>
      </section>

      {/* CTA band */}
      <section className="border-y border-ink bg-accent text-accent-ink">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-5 py-14 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <h2 className="max-w-lg font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("cta")}
          </h2>
          <Button asChild variant="default" size="lg">
            <Link href={isAuthed ? "/library" : "/signup"}>
              {isAuthed ? t("openWorkspace") : t("getStarted")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
