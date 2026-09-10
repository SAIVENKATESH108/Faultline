import { redis } from "@/lib/cache/redis";

// ─────────────────────────────────────────────────────────────────────────────
// CacheRepository<T>
//
// A generic cache layer that fronts Postgres with Redis.
// Callers inject Postgres accessor functions so this class stays
// domain-agnostic and is straightforward to unit-test with mocks.
//
// Usage pattern:
//
//   const repo = new CacheRepository<ConceptTree>(
//     (key)       => prisma.topic.findUnique(…),   // pgLookup
//     (key, val)  => prisma.topic.create(…),        // pgPersist
//   );
//
//   const tree = await repo.get("calculus");          // Redis → Postgres
//   await repo.set("calculus", tree, 3600);           // Redis + Postgres
// ─────────────────────────────────────────────────────────────────────────────

export class CacheRepository<T> {
  private static readonly DEFAULT_TTL_SECONDS = 86_400; // 24 hours

  /**
   * @param pgLookup   Async function that loads a value from Postgres by key.
   *                   Returns null when no record exists.
   * @param pgPersist  Async function that persists a value to Postgres by key.
   *                   Called only from set(); callers control the write path.
   */
  constructor(
    private readonly pgLookup: (key: string) => Promise<T | null>,
    private readonly pgPersist: (key: string, value: T) => Promise<void>,
  ) {}

  // ── get ──────────────────────────────────────────────────────────────────

  /**
   * Retrieve a value for `key`.
   *
   * Strategy:
   *   1. Try Redis.  On hit → deserialise and return immediately.
   *   2. On miss (or Redis error) → fall through to Postgres.
   *   3. If Postgres returns a value → back-fill Redis (fire-and-forget)
   *      and return the value.
   *   4. If neither source has the value → return null.
   */
  async get(key: string): Promise<T | null> {
    // ── 1. Redis lookup ──────────────────────────────────────────────────────
    try {
      const cached = await redis.get<T>(key);
      if (cached !== null && cached !== undefined) {
        return cached;
      }
    } catch (redisErr) {
      // Redis is a cache — degrade gracefully on connectivity issues.
      console.warn(`[CacheRepository] Redis get failed for key "${key}":`, redisErr);
    }

    // ── 2. Postgres fallback ─────────────────────────────────────────────────
    const pgValue = await this.pgLookup(key);
    if (pgValue === null) {
      return null;
    }

    // ── 3. Back-fill Redis (fire-and-forget) ─────────────────────────────────
    this.backfillRedis(key, pgValue).catch((err) =>
      console.warn(`[CacheRepository] Redis back-fill failed for key "${key}":`, err),
    );

    return pgValue;
  }

  // ── set ──────────────────────────────────────────────────────────────────

  /**
   * Persist `value` under `key` in both Redis and Postgres.
   *
   * Order:
   *   1. Call pgPersist so the source of truth is written first.
   *   2. Write to Redis with the given TTL (defaults to 24 h).
   *
   * A Redis write failure is logged but does NOT bubble up — the Postgres
   * write is the authoritative store.
   */
  async set(
    key: string,
    value: T,
    ttlSeconds: number = CacheRepository.DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    // ── 1. Postgres (source of truth) ────────────────────────────────────────
    await this.pgPersist(key, value);

    // ── 2. Redis ─────────────────────────────────────────────────────────────
    try {
      await redis.set(key, value, { ex: ttlSeconds });
    } catch (redisErr) {
      console.warn(`[CacheRepository] Redis set failed for key "${key}":`, redisErr);
    }
  }

  // ── private helpers ──────────────────────────────────────────────────────

  private async backfillRedis(
    key: string,
    value: T,
    ttlSeconds: number = CacheRepository.DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    await redis.set(key, value, { ex: ttlSeconds });
  }
}
