import { z } from "zod";
import type {
  ConceptTree,
  RemediationResponse,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Primitive / shared sub-schemas
// ─────────────────────────────────────────────────────────────────────────────

const DistractorSchema = z.object({
  text: z.string().min(1, "Distractor text must not be empty"),
  misconceptionId: z
    .string()
    .min(1, "misconceptionId must not be empty"),
});

const DiagnosticQuestionSchema = z.object({
  stem: z.string().min(1, "Question stem must not be empty"),
  correctAnswer: z.string().min(1, "correctAnswer must not be empty"),
  explanation: z.string().optional(),
  distractors: z
    .array(DistractorSchema)
    .length(3, "A question must have exactly 3 distractors")
    .superRefine((distractors, ctx) => {
      // All three misconceptionIds must be distinct
      const ids = distractors.map((d) => d.misconceptionId);
      const unique = new Set(ids);
      if (unique.size !== ids.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            `Distractor misconceptionIds must be distinct — found duplicates: ` +
            [...ids.filter((id, i) => ids.indexOf(id) !== i)].join(", "),
        });
      }
    }),
});

const ConceptNodeItemSchema = z.object({
  id: z.string().min(1, "Node id must not be empty"),
  label: z.string().min(1, "Node label must not be empty"),
  description: z.string().optional(),
  parentIds: z.array(z.string()).optional(),
});

const ConceptEdgeItemSchema = z.object({
  parentId: z.string().min(1),
  childId: z.string().min(1),
});

// ─────────────────────────────────────────────────────────────────────────────
// ConceptTreeSchema
// Validates the exact JSON shape the LLM must return.
//
// Business rules enforced via .superRefine():
//   1. nodes array length: 4–6
//   2. Every non-root node (parentIds absent or empty) must list ≥ 1 parentId
//   3. Exactly 1 diagnostic question (structural — the field is a single object)
//   4. Exactly 3 distractors per question (enforced inside DiagnosticQuestionSchema)
//   5. All distractor misconceptionIds are non-empty and distinct
// ─────────────────────────────────────────────────────────────────────────────

export const ConceptTreeSchema = z
  .object({
    topic: z.string().min(1, "topic must not be empty"),
    nodes: z
      .array(ConceptNodeItemSchema)
      .min(4, "ConceptTree must have at least 4 nodes")
      .max(6, "ConceptTree must have at most 6 nodes"),
    edges: z.array(ConceptEdgeItemSchema),
    question: DiagnosticQuestionSchema,
  })
  .superRefine((tree, ctx) => {
    // Determine which node is the root (no parentIds, or empty parentIds).
    // All other nodes must have ≥ 1 parentId.
    const nodeIds = new Set(tree.nodes.map((n) => n.id));

    tree.nodes.forEach((node, i) => {
      const hasParents =
        Array.isArray(node.parentIds) && node.parentIds.length > 0;

      // Count how many nodes have no parent — exactly one root is expected.
      if (!hasParents) return; // root candidate — ok

      // Non-root: must have ≥ 1 parentId and each parentId must reference
      // a node that actually exists in this tree.
      node.parentIds!.forEach((pid, j) => {
        if (!nodeIds.has(pid)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["nodes", i, "parentIds", j],
            message: `parentId "${pid}" does not reference any node in this tree`,
          });
        }
      });
    });

    // Verify exactly one root exists (node with no parentIds or empty list).
    const roots = tree.nodes.filter(
      (n) => !n.parentIds || n.parentIds.length === 0,
    );
    if (roots.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nodes"],
        message:
          "ConceptTree must have exactly one root node (a node with no parentIds)",
      });
    }
    if (roots.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nodes"],
        message:
          `ConceptTree must have exactly one root node, but found ${roots.length}: ` +
          roots.map((r) => r.id).join(", "),
      });
    }

    // Verify every non-root has ≥ 1 parentId (redundant with above but gives
    // a clear, targeted error message at the node level).
    tree.nodes.forEach((node) => {
      const isRoot = !node.parentIds || node.parentIds.length === 0;
      if (!isRoot) return;
      if (roots.length === 1 && node.id === roots[0].id) return;

      // This branch only fires when there are multiple roots — the loop
      // above already emitted a top-level error; skip per-node noise.
    });

    tree.nodes.forEach((node, i) => {
      const isRoot = roots.length === 1 && node.id === roots[0].id;
      if (isRoot) return;
      if (!node.parentIds || node.parentIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["nodes", i, "parentIds"],
          message: `Non-root node "${node.id}" must have at least one parentId`,
        });
      }
    });
  });

// ─────────────────────────────────────────────────────────────────────────────
// RemediationSchema
// Validates the JSON the LLM returns for a remediation call.
// ─────────────────────────────────────────────────────────────────────────────

export const RemediationSchema = z.object({
  misconceptionId: z.string().min(1, "misconceptionId must not be empty"),
  explanation: z.string().min(1, "explanation must not be empty"),
  resources: z
    .array(z.string().min(1))
    .min(1, "resources must contain at least one item"),
});

// ─────────────────────────────────────────────────────────────────────────────
// API request schemas (kept from original file)
// ─────────────────────────────────────────────────────────────────────────────

export const conceptTreeRequestSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(1, "Topic cannot be empty or whitespace-only.")
    .max(200, "Topic cannot exceed 200 characters."),
});

export const remediationRequestSchema = z.object({
  questionId: z.string().uuid("questionId must be a valid UUID"),
  misconceptionId: z
    .string()
    .trim()
    .min(1, "misconceptionId cannot be empty or whitespace-only."),
});

/** Schema for the public POST /api/remediate endpoint. */
export const remediateRouteSchema = z.object({
  nodeId: z
    .string()
    .trim()
    .min(1, "nodeId cannot be empty or whitespace-only."),
  misconceptionId: z
    .string()
    .trim()
    .min(1, "misconceptionId cannot be empty or whitespace-only."),
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: validateConceptTree
//
// Parses and validates an unknown JSON value against ConceptTreeSchema.
// Throws a descriptive Error (suitable for catch/retry logic in the route
// handler) if validation fails.  Returns the typed ConceptTree on success.
// ─────────────────────────────────────────────────────────────────────────────

export function validateConceptTree(json: unknown): ConceptTree {
  const result = ConceptTreeSchema.safeParse(json);

  if (!result.success) {
    // Build a human-readable summary of every violation so the retry prompt
    // can instruct the LLM precisely what it got wrong.
    const issues = result.error.issues
      .map((issue) => {
        const path = issue.path.length
          ? issue.path.join(".") + ": "
          : "";
        return `  • ${path}${issue.message}`;
      })
      .join("\n");

    throw new Error(
      `ConceptTree validation failed with ${result.error.issues.length} error(s):\n${issues}`,
    );
  }

  return result.data as ConceptTree;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: validateRemediation
//
// Mirrors validateConceptTree for the remediation route.
// ─────────────────────────────────────────────────────────────────────────────

export function validateRemediation(json: unknown): RemediationResponse {
  const result = RemediationSchema.safeParse(json);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => {
        const path = issue.path.length
          ? issue.path.join(".") + ": "
          : "";
        return `  • ${path}${issue.message}`;
      })
      .join("\n");

    throw new Error(
      `RemediationResponse validation failed with ${result.error.issues.length} error(s):\n${issues}`,
    );
  }

  return result.data as RemediationResponse;
}
