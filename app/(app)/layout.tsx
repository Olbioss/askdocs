import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { AuthProvider } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  // Defense in depth: the proxy redirects too, but enforce here as well since
  // layouts run server-side close to the data.
  if (!claims) {
    redirect("/login");
  }

  const user = { id: claims.sub, email: claims.email ?? "" };

  return (
    <AuthProvider initialUser={user}>
      <div className="flex h-svh flex-col overflow-hidden">
        <AppHeader />
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </AuthProvider>
  );
}
