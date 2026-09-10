// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript types for the Prometheus application
// These interfaces define the exact JSON shapes produced by the LLM and
// persisted to the database.  Zod schemas in lib/validation/schemas.ts
// are derived from these types.
// ─────────────────────────────────────────────────────────────────────────────

// ---------------------------------------------------------------------------
// Concept-tree types
// ---------------------------------------------------------------------------

/** A single node in the concept graph (flat list, not nested). */
export interface ConceptNodeItem {
  /** Stable, unique identifier within this tree (e.g. "node-1"). */
  id: string;
  /** Human-readable concept label. */
  label: string;
  /** Optional elaboration of the concept. */
  description?: string;
  /**
   * IDs of parent nodes.  Empty array or omitted only for the root node;
   * every non-root node must list at least one parentId.
   */
  parentIds?: string[];
}

/** A directed edge from parent → child within the concept graph. */
export interface ConceptEdgeItem {
  parentId: string;
  childId: string;
}

/** One distractor (wrong-answer option) in the diagnostic question. */
export interface DistractorItem {
  /** The distractor answer text shown to the learner. */
  text: string;
  /**
   * Short, non-empty identifier for the misconception this distractor targets.
   * Must be distinct across the three distractors in a question.
   */
  misconceptionId: string;
}

/** The single diagnostic question included in every ConceptTree. */
export interface DiagnosticQuestionItem {
  /** The question stem shown to the learner. */
  stem: string;
  /** The correct answer text. */
  correctAnswer: string;
  /** Optional explanation shown after the learner answers. */
  explanation?: string;
  /**
   * Exactly 3 distractors, each encoding a distinct misconception.
   */
  distractors: [DistractorItem, DistractorItem, DistractorItem];
}

/**
 * The complete concept-tree response returned by the LLM and stored in the DB.
 * Constraints (enforced by ConceptTreeSchema):
 *   - 4–6 nodes
 *   - Every non-root node has ≥ 1 parentId
 *   - Exactly 1 diagnostic question
 *   - Exactly 3 distractors, each with a non-empty distinct misconceptionId
 */
export interface ConceptTree {
  /** The topic string that was used to generate this tree. */
  topic: string;
  /** Flat list of concept nodes (4–6 items). */
  nodes: ConceptNodeItem[];
  /** Directed edges connecting the nodes. */
  edges: ConceptEdgeItem[];
  /** The one diagnostic question for this tree. */
  question: DiagnosticQuestionItem;
}

// ---------------------------------------------------------------------------
// Remediation types
// ---------------------------------------------------------------------------

/** The response shape returned by the remediation LLM call. */
export interface RemediationResponse {
  /** The misconception being addressed. */
  misconceptionId: string;
  /** A clear, concise explanation that corrects the misconception. */
  explanation: string;
  /** Ordered list of actionable study steps or resource links. */
  resources: string[];
}

// ---------------------------------------------------------------------------
// API request types (used in route handlers)
// ---------------------------------------------------------------------------

export interface ConceptTreeRequest {
  topic: string;
}

export interface RemediationRequest {
  questionId: string;
  misconceptionId: string;
}
