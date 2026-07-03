import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/supabase/actions";

export async function MarketingHeader() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthed = !!data?.claims;

  return (
    <header className="sticky top-0 z-40 border-b border-ink bg-paper">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-2">
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
                  Çıkış yap
                </Button>
              </form>
              <Button asChild variant="accent" size="sm">
                <Link href="/library">Uygulamayı aç</Link>
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
                <Link href="/login">Giriş yap</Link>
              </Button>
              <Button asChild variant="accent" size="sm">
                <Link href="/signup">Hemen başla</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
