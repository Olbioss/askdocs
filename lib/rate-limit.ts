import { sql } from "drizzle-orm";
import { db } from "./db";
import { rateLimits } from "./db/schema";

/**
 * Fixed-window rate limiter backed by Postgres — durable across serverless
 * instances with no extra infrastructure, which is plenty at free-tier scale.
 * One upsert per call: insert the window's counter or bump it, then compare.
 */
export async function checkRateLimit(
  userId: string,
  bucket: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  try {
    const rows = await db
      .insert(rateLimits)
      .values({ userId, bucket, windowStart, count: 1 })
      .onConflictDoUpdate({
        target: [rateLimits.userId, rateLimits.bucket, rateLimits.windowStart],
        set: { count: sql`${rateLimits.count} + 1` },
      })
      .returning({ count: rateLimits.count });
    return (rows[0]?.count ?? 1) <= limit;
  } catch (err) {
    // best-effort limiter: an unavailable counter must not take the API down
    console.error("rate-limit check failed (allowing request):", err);
    return true;
  }
}
