import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasUpstashConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

const upstashLimiter = hasUpstashConfig
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      analytics: true,
      prefix: "kanoon-saathi",
    })
  : null;

// Local-dev-only fallback. This map is per server-process, so on
// Vercel's actual multi-instance serverless runtime it would NOT
// enforce a shared limit across instances — it exists purely so the
// app runs without an Upstash account while developing, and it warns
// loudly rather than silently pretending to be a real limiter.
const devHits = new Map<string, { count: number; resetAt: number }>();
let warnedOnce = false;

function devLimiter(identifier: string, limit = 10, windowMs = 60_000) {
  if (!warnedOnce) {
    console.warn(
      "[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN not set — using an in-memory " +
        "limiter that only works for local development. Set both before " +
        "deploying to Vercel, or every serverless instance gets its own " +
        "independent limit.",
    );
    warnedOnce = true;
  }
  const now = Date.now();
  const existing = devHits.get(identifier);
  if (!existing || now > existing.resetAt) {
    devHits.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }
  existing.count += 1;
  return {
    success: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
  };
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
}

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  if (upstashLimiter) {
    const { success, remaining } = await upstashLimiter.limit(identifier);
    return { success, remaining };
  }
  return devLimiter(identifier);
}
