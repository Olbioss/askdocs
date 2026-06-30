import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DIRECT_URL! }, // direct connection for migrations
  // auth.users, authenticated/anon/service roles are managed by Supabase —
  // don't let drizzle-kit try to create or drop them.
  entities: { roles: { provider: "supabase" } },
});
