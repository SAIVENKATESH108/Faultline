import { Redis } from "@upstash/redis";

// ─────────────────────────────────────────────────────────────────────────────
// Upstash Redis client — configured from environment variables.
//
// UPSTASH_REDIS_REST_URL  and  UPSTASH_REDIS_REST_TOKEN  must be present in
// .env.local (or the deployment environment) before this module is imported.
// ─────────────────────────────────────────────────────────────────────────────

if (!process.env.UPSTASH_REDIS_REST_URL) {
  throw new Error(
    "Missing env var: UPSTASH_REDIS_REST_URL — add it to .env.local",
  );
}
if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error(
    "Missing env var: UPSTASH_REDIS_REST_TOKEN — add it to .env.local",
  );
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
