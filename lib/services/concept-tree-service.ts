import { prisma } from "@/lib/db/prisma";
import type { LLMClient } from "@/lib/services/llm-client";
import { CacheRepository } from "@/lib/services/cache-repository";
import type { ConceptTree } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// ConceptTreeService
//
// Orchestrates the full concept-tree lifecycle:
//   normalize topic → check cache → LLM generate → persist to Postgres
//   (transaction) → warm Redis → return.
//
// Dependencies are constructor-injected for testability.
// ─────────────────────────────────────────────────────────────────────────────

/** Cache key prefix — keeps Redis key-space organised. */
const CACHE_PREFIX = "concept-tree:";
const CACHE_TTL_SECONDS = 86_400; // 24 hours

// ── Slug normalisation ────────────────────────────────────────────────────────

/**
 * Converts a freeform topic string into a stable cache / DB key.
 *
 * Rules applied in order:
 *   1. Trim leading / trailing whitespace.
 *   2. Lowercase.
 *   3. Collapse interior whitespace runs into a single space.
 *   4. Replace spaces with hyphens.
 *   5. Strip any character that is not alphanumeric, hyphen, or underscore.
 */
function toSlug(topic: string): string {
  return topic
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

// ── Postgres lookup / persist helpers ────────────────────────────────────────
// These are passed to CacheRepository as pgLookup / pgPersist callbacks.
// Keeping them here (rather than inside the class) makes them easy to test.

async function fetchTopicWithDetails(slug: string) {
  return prisma.topic.findUnique({
    where: { slug },
    include: {
      conceptNodes: {
        include: {
          parentEdges: true,   // edges where this node is the child
          diagnosticQuestions: {
            include: { distractors: true },
          },
        },
      },
    },
  });
}

async function pgLookupConceptTree(slug: string): Promise<ConceptTree | null> {
  let attempts = 0;
  let topic: Awaited<ReturnType<typeof fetchTopicWithDetails>> = null;

  while (attempts < 2) {
    try {
      topic = await fetchTopicWithDetails(slug);
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

  if (!topic) return null;

  // Re-assemble the wire format expected by the rest of the app.
  const nodes = topic.conceptNodes.map((node) => ({
    id: node.id,
    label: node.label,
    description: node.description ?? undefined,
    parentIds: node.parentEdges.map((e) => e.parentId),
  }));

  const edges = topic.conceptNodes.flatMap((node) =>
    node.parentEdges.map((e) => ({ parentId: e.parentId, childId: e.childId })),
  );

  // There should be exactly one question per tree (enforced by the schema).
  const allQuestions = topic.conceptNodes.flatMap((n) => n.diagnosticQuestions);
  const q = allQuestions[0];

  if (!q) return null;

  const question = {
    stem: q.stem,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation ?? undefined,
    distractors: q.distractors.map((d) => ({
      text: d.text,
      misconceptionId: d.misconceptionId,
    })) as [
      { text: string; misconceptionId: string },
      { text: string; misconceptionId: string },
      { text: string; misconceptionId: string },
    ],
  };

  return { topic: topic.title, nodes, edges, question };
}

async function pgPersistConceptTree(
  slug: string,
  tree: ConceptTree,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 1. Upsert topic row (idempotent on slug — safe for retries).
    const topicRow = await tx.topic.upsert({
      where: { slug },
      update: { title: tree.topic, updatedAt: new Date() },
      create: { slug, title: tree.topic },
    });

    // 2. Insert concept nodes.
    //    We need the DB-assigned UUIDs, so we create them one by one and
    //    build a map from LLM node-id → DB UUID.
    const idMap = new Map<string, string>(); // LLM id → DB UUID

    for (const node of tree.nodes) {
      const dbNode = await tx.conceptNode.create({
        data: {
          topicId: topicRow.id,
          label: node.label,
          description: node.description ?? null,
        },
      });
      idMap.set(node.id, dbNode.id);
    }

    // 3. Insert edges, translating LLM ids to DB UUIDs.
    for (const edge of tree.edges) {
      const parentDbId = idMap.get(edge.parentId);
      const childDbId = idMap.get(edge.childId);
      if (!parentDbId || !childDbId) continue; // shouldn't happen post-validation
      await tx.conceptEdge.create({
        data: { parentId: parentDbId, childId: childDbId },
      });
    }

    // 4. Find the root node DB UUID (the one with no parentIds in LLM output).
    const rootLlmNode = tree.nodes.find(
      (n) => !n.parentIds || n.parentIds.length === 0,
    );
    const rootDbId = rootLlmNode ? idMap.get(rootLlmNode.id) : undefined;

    // 5. Insert the diagnostic question + distractors.
    //    Attach the question to the root node (or first node as fallback).
    const questionNodeId =
      rootDbId ?? idMap.values().next().value;

    if (questionNodeId) {
      await tx.diagnosticQuestion.create({
        data: {
          conceptNodeId: questionNodeId,
          stem: tree.question.stem,
          correctAnswer: tree.question.correctAnswer,
          explanation: tree.question.explanation ?? null,
          distractors: {
            create: tree.question.distractors.map((d) => ({
              text: d.text,
              misconceptionId: d.misconceptionId,
            })),
          },
        },
      });
    }
  });
}

// ── Service class ─────────────────────────────────────────────────────────────

export class ConceptTreeService {
  constructor(
    private readonly llm: LLMClient | (() => LLMClient),
    private readonly cache: CacheRepository<ConceptTree>,
  ) {}

  private getLLM(): LLMClient {
    return typeof this.llm === "function" ? this.llm() : this.llm;
  }

  /**
   * Return a ConceptTree for `topic`, creating one if it doesn't exist.
   *
   * Flow:
   *   1. Normalise topic → slug.
   *   2. Check cache (Redis → Postgres via CacheRepository.get).
   *   3. On miss: call LLM, persist to Postgres in a transaction,
   *      warm Redis, then return.
   */
  async getOrCreate(topic: string): Promise<ConceptTree> {
    const slug = toSlug(topic);
    const cacheKey = `${CACHE_PREFIX}${slug}`;

    // ── 1. Cache check ────────────────────────────────────────────────────────
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // ── 2. LLM generation ─────────────────────────────────────────────────────
    const llm = this.getLLM();
    const tree = await llm.generateConceptTree(topic);

    // ── 3. Persist + warm cache ───────────────────────────────────────────────
    // pgPersist writes to Postgres; Redis is warmed by CacheRepository.set.
    await this.cache.set(cacheKey, tree, CACHE_TTL_SECONDS);

    return tree;
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Convenience factory that wires up the concrete dependencies.
 * Import and call this in route handlers instead of constructing manually.
 */
export function createConceptTreeService(
  llm: LLMClient | (() => LLMClient),
): ConceptTreeService {
  const cache = new CacheRepository<ConceptTree>(
    (key) => pgLookupConceptTree(key.replace(CACHE_PREFIX, "")),
    (key, tree) => pgPersistConceptTree(key.replace(CACHE_PREFIX, ""), tree),
  );
  return new ConceptTreeService(llm, cache);
}
