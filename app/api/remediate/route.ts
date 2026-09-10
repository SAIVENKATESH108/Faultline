import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { LLMClient, LLMError } from "@/lib/services/llm-client";
import { createRemediationService } from "@/lib/services/remediation-service";
import { remediateRouteSchema } from "@/lib/validation/schemas";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/remediate
//
// Request body:  { "nodeId": string (UUID), "misconceptionId": string }
// Response body: RemediationResponse JSON
//
// Status codes:
//   200  — success
//   400  — body missing, malformed, empty/whitespace
//   404  — nodeId has no attached question
//   422  — LLM validation failure even after retry
//   503  — database connection failure
//   500  — generic server error
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

  const parsed = remediateRouteSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "Invalid remediation request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { nodeId, misconceptionId } = parsed.data;

  // ── 2. Resolve nodeId → questionId ─────────────────────────────────────────
  let questionId: string;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nodeId);

    // 1. Direct match: question directly attached to this node (if valid UUID)
    let question = isUuid
      ? await prisma.diagnosticQuestion.findFirst({
          where: { conceptNodeId: nodeId },
          select: { id: true },
        })
      : null;

    // 2. Topic match: question attached to any node in the same topic
    if (!question && isUuid) {
      const node = await prisma.conceptNode.findUnique({
        where: { id: nodeId },
        select: { topicId: true },
      });

      if (node?.topicId) {
        question = await prisma.diagnosticQuestion.findFirst({
          where: { conceptNode: { topicId: node.topicId } },
          select: { id: true },
        });
      }
    }

    // 3. Misconception match: question containing this misconception in its distractors
    if (!question) {
      question = await prisma.diagnosticQuestion.findFirst({
        where: {
          distractors: {
            some: { misconceptionId },
          },
        },
        select: { id: true },
      });
    }

    // 4. Any diagnostic question fallback to ensure valid foreign key
    if (!question) {
      question = await prisma.diagnosticQuestion.findFirst({
        select: { id: true },
      });
    }

    if (!question) {
      return NextResponse.json(
        {
          error:
            "No diagnostic question found in the database. " +
            "Ensure a concept tree has been built first.",
        },
        { status: 404 }
      );
    }

    questionId = question.id;
  } catch (dbErr) {
    if (isDatabaseConnectionError(dbErr)) {
      console.error("[/api/remediate] Postgres connection failure:", dbErr);
      return NextResponse.json(
        { error: "The database service is temporarily unavailable. Please try again shortly." },
        { status: 503 }
      );
    }

    console.error("[/api/remediate] DB lookup error:", dbErr);
    return NextResponse.json(
      { error: "Failed to look up the concept node. Please try again." },
      { status: 500 }
    );
  }

  // ── 3. Instantiate service + execute ────────────────────────────────────────
  try {
    const service = createRemediationService(() => LLMClient.getInstance());
    const remediation = await service.getOrGenerate(questionId, misconceptionId);
    return NextResponse.json(remediation, { status: 200 });
  } catch (err) {
    return handleServiceError(err);
  }
}

// ── Shared error helpers ──────────────────────────────────────────────────────

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
  if (isDatabaseConnectionError(err)) {
    console.error("[/api/remediate] Postgres connection failure:", err);
    return NextResponse.json(
      { error: "The database service is temporarily unavailable. Please try again shortly." },
      { status: 503 }
    );
  }

  const isLLM = err instanceof LLMError || (err instanceof Error && (err.name === "LLMError" || err.message.includes("Gemini") || err.message.includes("GEMINI_API_KEY")));
  if (isLLM) {
    const errMessage = (err as Error).message || "";
    const isKeyError = errMessage.includes("GEMINI_API_KEY");
    return NextResponse.json(
      {
        error: isKeyError
          ? "GEMINI_API_KEY is not set. Please add your GEMINI_API_KEY to .env.local for AI remediation."
          : errMessage.includes("Gemini")
          ? errMessage
          : "Couldn't generate remediation for that misconception. Please try rephrasing.",
      },
      { status: 422 }
    );
  }

  const fallbackMsg = err instanceof Error ? err.message : "An unexpected server error occurred. Please try again.";
  return NextResponse.json(
    { error: fallbackMsg },
    { status: 500 }
  );
}
