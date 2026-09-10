import { type NextRequest, NextResponse } from "next/server";
import { LLMClient, LLMError } from "@/lib/services/llm-client";
import { createConceptTreeService } from "@/lib/services/concept-tree-service";
import { conceptTreeRequestSchema } from "@/lib/validation/schemas";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/concept-tree
//
// Request body:  { "topic": string }
// Response body: ConceptTree JSON
//
// Status codes:
//   200  — success
//   400  — topic missing, empty, or whitespace-only
//   422  — LLM validation failure even after retry (friendly rephrase message)
//   503  — database connection failure
//   500  — generic unexpected server error
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── 1. Parse + validate request body ───────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = conceptTreeRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "Invalid topic input.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { topic } = parsed.data;

  // Double check whitespace-only topic
  if (!topic || topic.trim().length === 0) {
    return NextResponse.json(
      { error: "Topic cannot be empty or whitespace-only." },
      { status: 400 }
    );
  }

  // ── 2. Instantiate service + execute ────────────────────────────────────────
  try {
    const service = createConceptTreeService(() => LLMClient.getInstance());
    const tree = await service.getOrCreate(topic);
    return NextResponse.json(tree, { status: 200 });
  } catch (err) {
    return handleServiceError(err);
  }
}

// ── Shared error handler ──────────────────────────────────────────────────────

function isDatabaseConnectionError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { name?: string; code?: string; message?: string };
  const name = e.name || "";
  const code = e.code || "";
  const message = String(e.message || "").toLowerCase();

  return (
    name === "PrismaClientInitializationError" ||
    name === "PrismaClientRustPanicError" ||
    code === "P1000" ||
    code === "P1001" ||
    code === "P1002" ||
    code === "P1003" ||
    code === "P1017" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    message.includes("can't reach database server") ||
    message.includes("database connection") ||
    message.includes("connection closed") ||
    message.includes("connection reset") ||
    message.includes("connection refused") ||
    message.includes("client network socket disconnected") ||
    message.includes("database url")
  );
}

function handleServiceError(err: unknown): NextResponse {
  // Check for Postgres connection failure (log server-side, return 503 with generic message)
  if (isDatabaseConnectionError(err)) {
    console.error("[/api/concept-tree] Postgres connection failure:", err);
    return NextResponse.json(
      { error: "The database service is temporarily unavailable. Please try again shortly." },
      { status: 503 }
    );
  }

  // Log all other errors server-side for observability
  console.error("[/api/concept-tree] Service error:", err);

  // LLM JSON that fails Zod validation even after retry (friendly message, never raw error)
  if (err instanceof LLMError) {
    const isKeyError = err.message.includes("GEMINI_API_KEY");
    return NextResponse.json(
      {
        error: isKeyError
          ? "GEMINI_API_KEY is not set. Please add your GEMINI_API_KEY to .env.local to build new topics."
          : "Couldn't build that topic, try rephrasing.",
      },
      { status: 422 }
    );
  }

  // Generic fallback for unexpected errors (never leak stack traces)
  return NextResponse.json(
    { error: "An unexpected error occurred while generating this concept tree. Please try again." },
    { status: 500 }
  );
}
