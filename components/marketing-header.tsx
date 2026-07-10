import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/supabase/actions";

export async function MarketingHeader() {
  const t = await getTranslations("MarketingHeader");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthed = !!data?.claims;

  return (
    <header className="sticky top-0 z-40 border-b border-ink bg-paper">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-2">
          <LanguageSwitcher className="size-8" />
          <ThemeToggle className="size-8" />
          {isAuthed ? (
            <>
              <form action={signOut}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                >
                  {t("signOut")}
                </Button>
              </form>
              <Button asChild variant="accent" size="sm">
                <Link href="/library">{t("openApp")}</Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
              >
                <Link href="/login">{t("signIn")}</Link>
              </Button>
              <Button asChild variant="accent" size="sm">
                <Link href="/signup">{t("getStarted")}</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
