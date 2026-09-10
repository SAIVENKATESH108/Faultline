import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ConceptTree } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The progression state of a single concept node.
 *
 *   locked    — not yet reachable (parent not stable)
 *   available — reachable; learner can attempt the diagnostic question
 *   cracked   — learner has answered but got it wrong; remediation pending
 *   stable    — learner answered correctly; children can unlock
 */
export type NodeStatus = "locked" | "available" | "cracked" | "stable";

// ─────────────────────────────────────────────────────────────────────────────
// State + actions interface
// ─────────────────────────────────────────────────────────────────────────────

interface AppState {
  // ── State ──────────────────────────────────────────────────────────────────

  /** Slug of the topic whose concept tree is currently displayed. */
  activeTopicSlug: string | null;

  /** DB UUID of the concept node the learner is currently interacting with. */
  activeNodeId: string | null;

  /**
   * Per-node status map.  Keyed by DB node UUID (the `id` from ConceptNodeItem
   * as returned by the API — after persistence these are Postgres UUIDs).
   */
  nodeStatuses: Record<string, NodeStatus>;

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Set the active topic and reset any prior node state. */
  setActiveTopic: (slug: string) => void;

  /** Focus a node (e.g. the learner clicked on it). */
  setActiveNode: (nodeId: string | null) => void;

  /**
   * Directly set the status of a single node.
   * Prefer calling `unlockEligibleNodes` after setting a node to 'stable'
   * so downstream nodes are evaluated.
   */
  setNodeStatus: (nodeId: string, status: NodeStatus) => void;

  /**
   * Re-evaluate the entire tree and unlock any 'locked' nodes whose every
   * parent currently has status 'stable'.
   *
   * Algorithm:
   *   For every node that is currently 'locked':
   *     – Collect its parentIds from the ConceptTree.
   *     – If it has no parents (root) OR every parent's status === 'stable',
   *       promote it to 'available'.
   *   This runs in a single pass; call again after each status change to
   *   handle chains (or call in a loop until stable — not needed in practice
   *   because the tree is a DAG processed top-down by the learner).
   */
  unlockEligibleNodes: (tree: ConceptTree) => void;

  /** Reset node statuses and selections (e.g. when loading a new topic). */
  resetNodeStatuses: (nodeIds: string[]) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // ── Initial state ───────────────────────────────────────────────────────
      activeTopicSlug: null,
      activeNodeId: null,
      nodeStatuses: {},

      // ── setActiveTopic ──────────────────────────────────────────────────────
      setActiveTopic: (slug) =>
        set(
          { activeTopicSlug: slug, activeNodeId: null, nodeStatuses: {} },
          false,
          "setActiveTopic",
        ),

      // ── setActiveNode ───────────────────────────────────────────────────────
      setActiveNode: (nodeId) =>
        set({ activeNodeId: nodeId }, false, "setActiveNode"),

      // ── setNodeStatus ───────────────────────────────────────────────────────
      setNodeStatus: (nodeId, status) =>
        set(
          (state) => ({
            nodeStatuses: { ...state.nodeStatuses, [nodeId]: status },
          }),
          false,
          "setNodeStatus",
        ),

      // ── unlockEligibleNodes ─────────────────────────────────────────────────
      unlockEligibleNodes: (tree) => {
        const { nodeStatuses } = get();

        // Build a parentIds lookup from the flat node list.
        // The ConceptNodeItem.parentIds are LLM-assigned ids, but after DB
        // persistence the API returns DB UUIDs in the same field.
        const parentIdsOf = new Map<string, string[]>();
        for (const node of tree.nodes) {
          parentIdsOf.set(node.id, node.parentIds ?? []);
        }

        const next = { ...nodeStatuses };
        let changed = false;

        for (const node of tree.nodes) {
          // Only consider nodes that are currently locked.
          if (next[node.id] !== "locked") continue;

          const parents = parentIdsOf.get(node.id) ?? [];

          // Root nodes (no parents) become available immediately.
          // Non-root nodes require every parent to be 'stable'.
          const canUnlock =
            parents.length === 0 ||
            parents.every((pid) => next[pid] === "stable");

          if (canUnlock) {
            next[node.id] = "available";
            changed = true;
          }
        }

        if (changed) {
          set({ nodeStatuses: next }, false, "unlockEligibleNodes");
        }
      },

      // ── resetNodeStatuses ───────────────────────────────────────────────────
      resetNodeStatuses: (nodeIds) => {
        // Initialise every node as 'locked'; the caller should immediately
        // follow up with unlockEligibleNodes() to open the root.
        const initial: Record<string, NodeStatus> = {};
        for (const id of nodeIds) {
          initial[id] = "locked";
        }
        set(
          { nodeStatuses: initial, activeNodeId: null },
          false,
          "resetNodeStatuses",
        );
      },
    }),
    { name: "prometheus-app-store" },
  ),
);

// ─────────────────────────────────────────────────────────────────────────────
// Selectors (memoised via Zustand's built-in reference equality)
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the status of a specific node, defaulting to 'locked'. */
export const selectNodeStatus =
  (nodeId: string) =>
  (state: AppState): NodeStatus =>
    state.nodeStatuses[nodeId] ?? "locked";
