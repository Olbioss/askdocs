// lib/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { requireEnv } from "../env";
import * as schema from "./schema";

const client = postgres(requireEnv("DATABASE_URL"), {
  prepare: false, // pooler-safe (Supavisor transaction mode)
  max: 5, // modest per-instance pool; Fluid Compute reuses instances
  idle_timeout: 20,
  connect_timeout: 10,
});
export const db = drizzle(client, { schema });
