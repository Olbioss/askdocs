"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, MessagesSquare, User } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/components/auth-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/library", label: "Kitaplık", icon: FileText },
  { href: "/chat", label: "Sohbet", icon: MessagesSquare },
];

export function AppHeader() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <header className="z-40 shrink-0 border-b border-ink bg-paper">
      <div className="flex h-14 items-stretch justify-between pl-5 pr-3 sm:pl-8 sm:pr-5">
        <div className="flex items-stretch gap-8">
          <div className="flex items-center">
            <Logo />
          </div>
          <nav className="flex items-stretch">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "label relative flex items-center gap-2 px-4 transition-colors",
                    active ? "text-ink" : "text-ink-40 hover:text-ink",
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                  {active && (
                    <span className="absolute inset-x-2 bottom-0 h-0.75 bg-accent" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger
              className="grid size-9 place-items-center border border-ink bg-paper text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-none data-[state=open]:bg-ink data-[state=open]:text-paper"
              aria-label="Hesap menüsü"
            >
              {user ? (
                <span className="font-mono text-xs font-semibold uppercase">
                  {user.email.slice(0, 2)}
                </span>
              ) : (
                <User className="size-4" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>
                {user ? user.email : "Oturum açılmadı"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user ? (
                <DropdownMenuItem onSelect={() => signOut()}>
                  Çıkış yap
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/login">Giriş yap</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/signup">Hesap oluştur</Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
