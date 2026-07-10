"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthValue {
  user: AuthUser | null;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthValue>({
  user: null,
  signOut: async () => {},
});

/**
 * Holds the current user for client UI. `initialUser` comes from the server
 * (authoritative, verified via getClaims); the subscription keeps it in sync
 * on sign-in / sign-out / token refresh. Client session is for display only —
 * authorization is enforced server-side (proxy + layout).
 */
export function AuthProvider({
  initialUser = null,
  children,
}: {
  initialUser?: AuthUser | null;
  children: React.ReactNode;
}) {
  const t = useTranslations("AuthProvider");
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [user, setUser] = React.useState<AuthUser | null>(initialUser);

  React.useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email ?? "" } : null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    toast.success(t("signedOut"));
    router.push("/login");
    router.refresh();
  }, [supabase, router, t]);

  const value = React.useMemo(() => ({ user, signOut }), [user, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return React.useContext(AuthContext);
}
