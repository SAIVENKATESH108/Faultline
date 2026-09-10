import { GoogleGenAI } from "@google/genai";
import type {
  ConceptTree,
  RemediationRequest,
  RemediationResponse,
} from "@/lib/types";
import {
  validateConceptTree,
  validateRemediation,
} from "@/lib/validation/schemas";

// ─────────────────────────────────────────────────────────────────────────────
// System prompts
// These strings encode the exact JSON shape that the Zod schemas validate,
// so any change here must be kept in sync with lib/validation/schemas.ts.
// ─────────────────────────────────────────────────────────────────────────────

const CONCEPT_TREE_SYSTEM_PROMPT = `\
You are an expert curriculum designer and knowledge-graph architect.

Given a topic, you must respond with a single, raw JSON object — no markdown
fences, no prose, no explanation — that strictly conforms to this TypeScript
interface:

{
  "topic":   string,          // the topic as provided
  "nodes": [                  // 4 to 6 nodes (inclusive)
    {
      "id":          string,  // short stable identifier, e.g. "node-1"
      "label":       string,  // concise concept name
      "description": string,  // 1-2 sentence elaboration (optional but encouraged)
      "parentIds":   string[] // omit or use [] ONLY for the single root node;
                              // every other node MUST list ≥ 1 parentId from this tree
    }
  ],
  "edges": [                  // one entry per parent→child relationship
    { "parentId": string, "childId": string }
  ],
  "question": {               // exactly ONE diagnostic question for the whole tree
    "stem":          string,
    "correctAnswer": string,
    "explanation":   string,  // shown after the learner answers (optional)
    "distractors": [          // EXACTLY 3 — no more, no less
      { "text": string, "misconceptionId": string },
      { "text": string, "misconceptionId": string },
      { "text": string, "misconceptionId": string }
    ]
                              // Each misconceptionId MUST be non-empty and DISTINCT
                              // across all three distractors.
  }
}

Hard constraints:
- Output ONLY the JSON object. No markdown, no code fences, no commentary.
- nodes array: minimum 4, maximum 6 items.
- Exactly one root node (parentIds absent or []).
- Every non-root node must include at least one parentId that exists in nodes.
- question.distractors: exactly 3 items.
- All three misconceptionId values must be non-empty strings that differ from each other.
`;

const REMEDIATION_SYSTEM_PROMPT = `\
You are an expert learning coach specialising in correcting student misconceptions.

Given a misconception identifier and context, you must respond with a single,
raw JSON object — no markdown fences, no prose — that strictly conforms to:

{
  "misconceptionId": string,  // echo back the misconceptionId you received
  "explanation":     string,  // clear, empathetic correction of the misconception
  "resources": [              // at least 1 actionable study step or resource URL
    string
  ]
}

Hard constraints:
- Output ONLY the JSON object. No markdown, no code fences, no commentary.
- misconceptionId must be non-empty and must match the one you received.
- explanation must be non-empty.
- resources must be a non-empty array of non-empty strings.
`;

// ─────────────────────────────────────────────────────────────────────────────
// Typed error
// ─────────────────────────────────────────────────────────────────────────────

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly attempt?: number,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Strip ```json … ``` or ``` … ``` fences that LLMs occasionally emit. */
function stripMarkdownFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

/** Parse JSON safely, converting SyntaxError into LLMError. */
function parseJSON(raw: string, attempt: number): unknown {
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new LLMError(
      `Gemini response was not valid JSON (attempt ${attempt}): ${raw.slice(0, 200)}`,
      err,
      attempt,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LLMClient — Singleton wrapping the Google GenAI (Gemini) SDK
// ─────────────────────────────────────────────────────────────────────────────

export class LLMClient {
  private static instance: LLMClient | null = null;

  private readonly ai: GoogleGenAI;
  private readonly model: string;

  private constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      throw new LLMError(
        "GEMINI_API_KEY is not set. Please add your GEMINI_API_KEY to .env.local.",
      );
    }

    this.model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    this.ai = new GoogleGenAI({
      apiKey,
    });
  }

  /** Returns the shared LLMClient instance, creating it on first call. */
  static getInstance(): LLMClient {
    if (!LLMClient.instance) {
      LLMClient.instance = new LLMClient();
    }
    return LLMClient.instance;
  }

  // ── Core API call via Gemini ─────────────────────────────────────────────

  private async callGemini(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    const candidateModels = [
      this.model,
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-2.5-flash-lite",
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    let lastError: unknown = null;

    for (const model of candidateModels) {
      try {
        const response = await this.ai.models.generateContent({
          model,
          contents: userMessage,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });

        const text = response.text;
        if (!text) {
          throw new LLMError("Gemini returned an empty response text.");
        }
        return stripMarkdownFences(text);
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);

        // If it's a model not found / deprecated / rate limit error, try next candidate
        if (
          msg.includes("404") ||
          msg.includes("NOT_FOUND") ||
          msg.includes("no longer available") ||
          msg.includes("not found for API version") ||
          msg.includes("429") ||
          msg.includes("RESOURCE_EXHAUSTED") ||
          msg.includes("quota")
        ) {
          console.warn(`[LLMClient] Model ${model} limit/unavailable (${msg.slice(0, 80)}...), cascading to next model...`);
          continue;
        }

        if (err instanceof LLMError) throw err;
        throw new LLMError(`Gemini generation failed: ${msg}`, err);
      }
    }

    const finalMsg = lastError instanceof Error ? lastError.message : String(lastError);
    throw new LLMError(`Gemini generation failed across candidate models: ${finalMsg}`, lastError);
  }

  // ── generateConceptTree ──────────────────────────────────────────────────

  /**
   * Ask Gemini to generate a concept tree for `topic`.
   *
   * Flow:
   *  1. Call Gemini with CONCEPT_TREE_SYSTEM_PROMPT.
   *  2. Strip markdown fences, parse JSON, validate with ConceptTreeSchema.
   *  3. If validation fails → retry ONCE with the validation errors appended
   *     to the system prompt so Gemini knows exactly what to fix.
   *  4. If the retry also fails → throw LLMError.
   */
  async generateConceptTree(topic: string): Promise<ConceptTree> {
    const userMessage = `Generate a concept tree for the topic: "${topic}"`;

    // ── Attempt 1 ────────────────────────────────────────────────────────────
    let raw = await this.callGemini(CONCEPT_TREE_SYSTEM_PROMPT, userMessage);
    let parsed = parseJSON(raw, 1);

    try {
      return validateConceptTree(parsed);
    } catch (firstError) {
      const validationDetail =
        firstError instanceof Error ? firstError.message : String(firstError);

      // ── Attempt 2 (retry with corrective system-prompt augmentation) ───────
      const retrySystemPrompt =
        CONCEPT_TREE_SYSTEM_PROMPT +
        `\n\n--- CORRECTION REQUIRED ---\n` +
        `Your previous response failed schema validation. Fix ALL of the ` +
        `following issues before responding:\n\n` +
        validationDetail +
        `\n\nRespond ONLY with corrected JSON. No commentary.`;

      raw = await this.callGemini(retrySystemPrompt, userMessage);
      parsed = parseJSON(raw, 2);

      try {
        return validateConceptTree(parsed);
      } catch (retryError) {
        const retryDetail =
          retryError instanceof Error ? retryError.message : String(retryError);
        throw new LLMError(
          `generateConceptTree failed after 2 attempts.\n` +
            `Attempt 1 error: ${validationDetail}\n` +
            `Attempt 2 error: ${retryDetail}`,
          retryError,
          2,
        );
      }
    }
  }

  // ── generateRemediation ──────────────────────────────────────────────────

  /**
   * Ask Gemini to generate a remediation explanation for a misconception.
   *
   * Flow mirrors generateConceptTree: call → validate → retry once → throw.
   */
  async generateRemediation(
    input: RemediationRequest,
  ): Promise<RemediationResponse> {
    const userMessage =
      `Provide a remediation for the following misconception.\n` +
      `misconceptionId: "${input.misconceptionId}"\n` +
      `questionId context: "${input.questionId}"`;

    // ── Attempt 1 ────────────────────────────────────────────────────────────
    let raw = await this.callGemini(REMEDIATION_SYSTEM_PROMPT, userMessage);
    let parsed = parseJSON(raw, 1);

    try {
      return validateRemediation(parsed);
    } catch (firstError) {
      const validationDetail =
        firstError instanceof Error ? firstError.message : String(firstError);

      // ── Attempt 2 ────────────────────────────────────────────────────────
      const retrySystemPrompt =
        REMEDIATION_SYSTEM_PROMPT +
        `\n\n--- CORRECTION REQUIRED ---\n` +
        `Your previous response failed schema validation. Fix ALL of the ` +
        `following issues before responding:\n\n` +
        validationDetail +
        `\n\nRespond ONLY with corrected JSON. No commentary.`;

      raw = await this.callGemini(retrySystemPrompt, userMessage);
      parsed = parseJSON(raw, 2);

      try {
        return validateRemediation(parsed);
      } catch (retryError) {
        const retryDetail =
          retryError instanceof Error ? retryError.message : String(retryError);
        throw new LLMError(
          `generateRemediation failed after 2 attempts.\n` +
            `Attempt 1 error: ${validationDetail}\n` +
            `Attempt 2 error: ${retryDetail}`,
          retryError,
          2,
        );
      }
    }
  }
}
