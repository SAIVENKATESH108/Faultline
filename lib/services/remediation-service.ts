import { prisma } from "@/lib/db/prisma";
import type { LLMClient } from "@/lib/services/llm-client";
import { CacheRepository } from "@/lib/services/cache-repository";
import type { RemediationRequest, RemediationResponse } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// RemediationService
//
// Orchestrates the remediation lifecycle:
//   build cache key → check cache → LLM generate → upsert remediation_cache
//   (honouring the unique constraint on question_id + misconception_id)
//   → warm Redis → return.
//
// Dependencies are constructor-injected for testability.
// ─────────────────────────────────────────────────────────────────────────────

/** Cache key prefix — keeps Redis key-space organised. */
const CACHE_PREFIX = "remediation:";
const CACHE_TTL_SECONDS = 604_800; // 7 days — remediation content is stable

// ── Cache key ─────────────────────────────────────────────────────────────────

/**
 * Builds a deterministic Redis key for a (questionId, misconceptionId) pair.
 * The separator `|` cannot appear in UUIDs or well-formed misconceptionIds.
 */
function cacheKey(questionId: string, misconceptionId: string): string {
  return `${CACHE_PREFIX}${questionId}|${misconceptionId}`;
}

// ── Postgres lookup / persist helpers ────────────────────────────────────────

/**
 * Key format for the Postgres helpers is the raw `questionId|misconceptionId`
 * string (CACHE_PREFIX already stripped by CacheRepository factory).
 */
async function pgLookupRemediation(
  compositeKey: string,
): Promise<RemediationResponse | null> {
  const [questionId, ...rest] = compositeKey.split("|");
  const misconceptionId = rest.join("|"); // safe if misconceptionId contains |

  if (!questionId || !misconceptionId) return null;

  let attempts = 0;
  let row: any = null;

  while (attempts < 2) {
    try {
      row = await prisma.remediationCache.findUnique({
        where: { questionId_misconceptionId: { questionId, misconceptionId } },
      });
      break;
    } catch (err: unknown) {
      attempts++;
      const e = err as { message?: string; code?: string };
      const msg = String(e?.message || "").toLowerCase();
      const code = e?.code || "";
      if (attempts >= 2 || (code !== "ECONNRESET" && !msg.includes("client network socket disconnected"))) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  if (!row) return null;

  return {
    misconceptionId: row.misconceptionId,
    explanation: row.content, // DB stores the full LLM output as `content`
    resources: [],             // resources are embedded inside content (JSON)
    ...safeParseCachedContent(row.content),
  };
}

async function pgPersistRemediation(
  compositeKey: string,
  response: RemediationResponse,
): Promise<void> {
  const [questionId, ...rest] = compositeKey.split("|");
  const misconceptionId = rest.join("|");

  if (!questionId || !misconceptionId) return;

  // Serialise the full response as JSON so we can reconstruct it on read.
  const content = JSON.stringify(response);

  let attempts = 0;
  while (attempts < 2) {
    try {
      await prisma.remediationCache.upsert({
        where: { questionId_misconceptionId: { questionId, misconceptionId } },
        update: { content },
        create: { questionId, misconceptionId, content },
      });
      break;
    } catch (err: unknown) {
      attempts++;
      const e = err as { message?: string; code?: string };
      const msg = String(e?.message || "").toLowerCase();
      const code = e?.code || "";
      if (attempts >= 2 || (code !== "ECONNRESET" && !msg.includes("client network socket disconnected"))) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }
}

// ── Serialisation helpers ─────────────────────────────────────────────────────

/**
 * The `content` column stores the full RemediationResponse as JSON.
 * This function safely parses it back — falling back to empty resources
 * if the stored value is a plain string (legacy / hand-inserted rows).
 */
function safeParseCachedContent(
  raw: string,
): Partial<RemediationResponse> {
  try {
    const parsed = JSON.parse(raw) as RemediationResponse;
    if (parsed && typeof parsed === "object" && "explanation" in parsed) {
      return { explanation: parsed.explanation, resources: parsed.resources ?? [] };
    }
  } catch {
    // raw is a plain string — treat it as the explanation
  }
  return { explanation: raw, resources: [] };
}

// ── Service class ─────────────────────────────────────────────────────────────

export class RemediationService {
  constructor(
    private readonly llm: LLMClient | (() => LLMClient),
    private readonly cache: CacheRepository<RemediationResponse>,
  ) {}

  private getLLM(): LLMClient {
    return typeof this.llm === "function" ? this.llm() : this.llm;
  }

  /**
   * Return a RemediationResponse for the given (questionId, misconceptionId)
   * pair, generating one via the LLM if it doesn't exist.
   *
   * Flow:
   *   1. Build a composite cache key from questionId + misconceptionId.
   *   2. Check cache (Redis → Postgres via CacheRepository.get).
   *   3. On miss: call LLM.generateRemediation, upsert into
   *      remediation_cache (using the DB unique constraint), warm Redis.
   *   4. Return the RemediationResponse.
   */
  async getOrGenerate(
    questionId: string,
    misconceptionId: string,
  ): Promise<RemediationResponse> {
    const key = cacheKey(questionId, misconceptionId);

    // ── 1. Cache check ────────────────────────────────────────────────────────
    const cached = await this.cache.get(key);
    if (cached) return cached;

    // ── 2. LLM generation ─────────────────────────────────────────────────────
    const llm = this.getLLM();
    const input: RemediationRequest = { questionId, misconceptionId };
    const response = await llm.generateRemediation(input);

    // ── 3. Persist + warm cache ───────────────────────────────────────────────
    await this.cache.set(key, response, CACHE_TTL_SECONDS);

    return response;
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Convenience factory that wires up the concrete Postgres callbacks.
 * Import and call this in route handlers.
 */
export function createRemediationService(
  llm: LLMClient | (() => LLMClient),
): RemediationService {
  const cache = new CacheRepository<RemediationResponse>(
    (key) => pgLookupRemediation(key.replace(CACHE_PREFIX, "")),
    (key, response) => pgPersistRemediation(key.replace(CACHE_PREFIX, ""), response),
  );
  return new RemediationService(llm, cache);
}
