"use client";

import React, { useEffect, useRef, useMemo, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import type { ConceptTree as ConceptTreeType, ConceptNodeItem } from "@/lib/types";
import { useAppStore, type NodeStatus } from "@/store/useAppStore";
import { Chip } from "@/components/ui/Chip";

// ─────────────────────────────────────────────────────────────────────────────
// Props interface
// ─────────────────────────────────────────────────────────────────────────────

export interface ConceptTreeProps {
  /** The concept tree data structure. If not provided, can be driven externally. */
  tree?: ConceptTreeType | null;
  /** Optional override for node statuses; falls back to useAppStore. */
  nodeStatuses?: Record<string, NodeStatus>;
  /** Optional override for active node; falls back to useAppStore. */
  activeNodeId?: string | null;
  /** Optional callback when a node is clicked. */
  onNodeSelect?: (nodeId: string) => void;
  /** Optional custom container CSS class. */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: Depth Computation (DAG)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes topological depth for every node in the tree.
 * Root nodes (no parentIds or empty parentIds) are at depth 0 ("Bedrock").
 * Child nodes are at depth = 1 + max(parent depths).
 */
function computeNodeDepths(nodes: ConceptNodeItem[]): Map<string, number> {
  const depthMap = new Map<string, number>();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  function getDepth(nodeId: string, visited = new Set<string>()): number {
    if (depthMap.has(nodeId)) return depthMap.get(nodeId)!;
    if (visited.has(nodeId)) return 0; // Avoid cycles

    visited.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (!node || !node.parentIds || node.parentIds.length === 0) {
      depthMap.set(nodeId, 0);
      return 0;
    }

    let maxParentDepth = -1;
    for (const pid of node.parentIds) {
      if (nodeMap.has(pid)) {
        maxParentDepth = Math.max(maxParentDepth, getDepth(pid, new Set(visited)));
      }
    }

    const calculatedDepth = maxParentDepth >= 0 ? maxParentDepth + 1 : 0;
    depthMap.set(nodeId, calculatedDepth);
    return calculatedDepth;
  }

  for (const node of nodes) {
    getDepth(node.id);
  }

  return depthMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// StrataLayer Component
// ─────────────────────────────────────────────────────────────────────────────

interface StrataLayerProps {
  depth: number;
  maxDepth: number;
  nodes: ConceptNodeItem[];
  nodeStatuses: Record<string, NodeStatus>;
  activeNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  searchQuery?: string;
  statusFilter?: "all" | NodeStatus;
}

function StrataLayer({
  depth,
  maxDepth,
  nodes,
  nodeStatuses,
  activeNodeId,
  onNodeClick,
  searchQuery = "",
  statusFilter = "all",
}: StrataLayerProps) {
  const isBedrock = depth === 0;
  const isSurface = depth === maxDepth;

  // Layer is available if at least one node in this layer is not 'locked'
  const isLayerAvailable = useMemo(() => {
    return nodes.some((node) => {
      const status = nodeStatuses[node.id] ?? "locked";
      return status !== "locked";
    });
  }, [nodes, nodeStatuses]);

  // Framer Motion controls
  const controls = useAnimationControls();
  const prevAvailableRef = useRef<boolean>(false);
  const isFirstRunRef = useRef<boolean>(true);

  useEffect(() => {
    // Detect prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      prevAvailableRef.current = isLayerAvailable;

      if (isLayerAvailable) {
        // Animate initial state into full view on mount if already available
        if (prefersReducedMotion) {
          controls.set({ rotateX: 0, y: 0, opacity: 1 });
        } else {
          controls.start({
            rotateX: 0,
            y: 0,
            opacity: 1,
            transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
          });
        }
      } else {
        // Locked initial state
        controls.set({
          rotateX: -15,
          y: 20,
          opacity: 0.35,
        });
      }
      return;
    }

    // Transition from locked to available (detected via prop/state change, not every render)
    if (!prevAvailableRef.current && isLayerAvailable) {
      if (prefersReducedMotion) {
        controls.set({ rotateX: 0, y: 0, opacity: 1 });
      } else {
        controls.start({
          rotateX: [-15, 0],
          y: [20, 0],
          opacity: [0, 1],
          transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
        });
      }
    } else if (prevAvailableRef.current && !isLayerAvailable) {
      // Re-locked
      controls.start({
        rotateX: -15,
        y: 20,
        opacity: 0.35,
        transition: { duration: 0.2 },
      });
    }

    prevAvailableRef.current = isLayerAvailable;
  }, [isLayerAvailable, controls]);

  // Strata geological title styling
  const layerLabel = isBedrock
    ? "BEDROCK • FOUNDATIONAL CONCEPTS"
    : isSurface
    ? `SURFACE • APEX SYNTHESIS (DEPTH ${depth})`
    : `STRATUM ${depth} • INTERMEDIATE`;

  const layerSubtext = isBedrock
    ? "Base cognitive layer — prerequisite foundations required for higher reasoning"
    : isSurface
    ? "Terminal synthesis & emergent mastery concepts"
    : `Transitional depth stratum ${depth}`;

  return (
    // Wrap each layer in a container with CSS perspective: 800px
    <div
      className="w-full flex flex-col items-center relative my-2.5 overflow-x-hidden"
      style={{ perspective: "800px" }}
    >
      <motion.div
        animate={controls}
        initial={{
          rotateX: -15,
          y: 20,
          opacity: isLayerAvailable ? 0 : 0.35,
        }}
        style={{
          transformStyle: "preserve-3d",
          width: "100%",
          maxWidth: "880px",
        }}
        className={`rounded-xl border p-4 sm:p-5 transition-all duration-200 ${
          isBedrock
            ? "bg-[var(--surface-1)] border-[var(--ink-border)]/60 shadow-md"
            : "bg-[var(--surface-1)] border-[var(--mist)] shadow-xs"
        }`}
      >
        {/* Strata Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--mist)] text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded font-mono text-[10px] uppercase tracking-wider font-bold ${
                isBedrock
                  ? "bg-[var(--ink-subtle)] text-[var(--ink-bright)] border border-[var(--ink-border)]/60"
                  : isSurface
                  ? "bg-[var(--ember-subtle)] text-[var(--ember-bright)] border border-[var(--ember-border)]/60"
                  : "bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--mist)]"
              }`}
            >
              {layerLabel}
            </span>
            <span className="hidden sm:inline text-[var(--text-secondary)] font-medium font-sans">
              {layerSubtext}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--text-primary)] font-semibold">
            <span>
              Depth {depth}
              {isBedrock && " (Base)"}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                isLayerAvailable ? "bg-[var(--stable-bright)] animate-pulse" : "bg-[var(--mist-100)]"
              }`}
              title={isLayerAvailable ? "Layer Unlocked" : "Layer Locked"}
            />
          </div>
        </div>

        {/* Nodes grouped as a horizontal layer */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 py-2">
          {nodes.map((node) => {
            const status = nodeStatuses[node.id] ?? "locked";
            const isLocked = status === "locked";
            const isNodeActive = node.id === activeNodeId;

            // Search & filter matching
            const matchesSearch =
              !searchQuery.trim() ||
              node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
              Boolean(node.description?.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesStatus = statusFilter === "all" || status === statusFilter;
            const isFilteredOut = !matchesSearch || !matchesStatus;

            return (
              <div
                key={node.id}
                style={{
                  opacity: isFilteredOut ? 0.15 : isLocked ? 0.8 : 1,
                  pointerEvents: isLocked || isFilteredOut ? "none" : "auto",
                  cursor: isLocked ? "not-allowed" : "pointer",
                  transition:
                    "opacity var(--duration-base, 150ms) var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1))",
                }}
                className={`flex items-center transition-all ${
                  searchQuery && matchesSearch ? "ring-2 ring-[var(--ink-bright)] ring-offset-2 rounded-full ring-offset-[var(--surface-1)]" : ""
                }`}
              >
                <Chip
                  label={node.label}
                  status={status}
                  isActive={isNodeActive}
                  tooltip={node.description || `${node.label} (${status})`}
                  clickable={!isLocked && !isFilteredOut}
                  onClick={() => {
                    if (!isLocked && !isFilteredOut) {
                      onNodeClick(node.id);
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ConceptTree Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ConceptTree({
  tree: propsTree,
  nodeStatuses: propsNodeStatuses,
  activeNodeId: propsActiveNodeId,
  onNodeSelect,
  className = "",
}: ConceptTreeProps) {
  // Store integration
  const storeActiveNodeId = useAppStore((s) => s.activeNodeId);
  const storeNodeStatuses = useAppStore((s) => s.nodeStatuses);
  const setActiveNode = useAppStore((s) => s.setActiveNode);

  const activeNodeId = propsActiveNodeId ?? storeActiveNodeId;
  const nodeStatuses = propsNodeStatuses ?? storeNodeStatuses;

  // Handle node selection
  const handleNodeClick = (nodeId: string) => {
    setActiveNode(nodeId);
    if (onNodeSelect) {
      onNodeSelect(nodeId);
    }
  };

  // Compute depth for all nodes
  const { layers, maxDepth } = useMemo(() => {
    if (!propsTree || !propsTree.nodes || propsTree.nodes.length === 0) {
      return { layers: new Map<number, ConceptNodeItem[]>(), maxDepth: 0 };
    }

    const depthMap = computeNodeDepths(propsTree.nodes);
    const grouped = new Map<number, ConceptNodeItem[]>();
    let highestDepth = 0;

    for (const node of propsTree.nodes) {
      const d = depthMap.get(node.id) ?? 0;
      if (d > highestDepth) highestDepth = d;

      const list = grouped.get(d) ?? [];
      list.push(node);
      grouped.set(d, list);
    }

    return { layers: grouped, maxDepth: highestDepth };
  }, [propsTree]);

  // Search, Filter & Sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | NodeStatus>("all");
  const [sortOrder, setSortOrder] = useState<"geological" | "apex-first">("geological");
  const [showInspector, setShowInspector] = useState(true);

  // Active node object
  const activeNode = useMemo(() => {
    if (!propsTree?.nodes || !activeNodeId) return null;
    return propsTree.nodes.find((n) => n.id === activeNodeId) ?? null;
  }, [propsTree, activeNodeId]);

  // Prerequisites (parents) and Dependents (children) of active node
  const { parentNodes, childNodes } = useMemo(() => {
    if (!propsTree?.nodes || !activeNode) return { parentNodes: [], childNodes: [] };
    const parents = (activeNode.parentIds ?? [])
      .map((pid) => propsTree.nodes.find((n) => n.id === pid))
      .filter(Boolean) as ConceptNodeItem[];
    const children = propsTree.nodes.filter((n) =>
      n.parentIds?.includes(activeNode.id)
    );
    return { parentNodes: parents, childNodes: children };
  }, [propsTree, activeNode]);

  // Mastery percentage calculation
  const totalNodesCount = propsTree?.nodes?.length ?? 0;
  const stableCount = useMemo(() => {
    if (!propsTree?.nodes) return 0;
    return propsTree.nodes.filter((n) => (nodeStatuses[n.id] ?? "locked") === "stable").length;
  }, [propsTree, nodeStatuses]);

  const masteryPercentage =
    totalNodesCount > 0 ? Math.round((stableCount / totalNodesCount) * 100) : 0;

  // Order layers based on sortOrder
  const orderedDepths = useMemo(() => {
    const depths = Array.from(layers.keys());
    if (sortOrder === "apex-first") {
      // Ascending: 0 (bedrock) at top, maxDepth at bottom
      return depths.sort((a, b) => a - b);
    }
    // Geological: maxDepth at top, 0 (bedrock) at bottom
    return depths.sort((a, b) => b - a);
  }, [layers, sortOrder]);

  // Filtered nodes count
  const filteredNodesCount = useMemo(() => {
    if (!propsTree?.nodes) return 0;
    return propsTree.nodes.filter((node) => {
      const matchesSearch =
        !searchQuery.trim() ||
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const status = nodeStatuses[node.id] ?? "locked";
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      return matchesSearch && matchesStatus;
    }).length;
  }, [propsTree, searchQuery, statusFilter, nodeStatuses]);

  // Empty state if no tree provided
  if (!propsTree || !propsTree.nodes || propsTree.nodes.length === 0) {
    return (
      <div
        className={`w-full p-8 flex flex-col items-center justify-center border border-dashed border-[var(--mist)] bg-[var(--surface-1)] rounded-xl text-center ${className}`}
      >
        <div className="text-[var(--text-secondary)] font-sans font-medium mb-1">
          No Concept Tree Loaded
        </div>
        <p className="text-xs text-[var(--text-tertiary)] font-mono">
          Enter a topic to generate geological concept strata.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`concept-tree-container w-full flex flex-col items-center px-2 sm:px-4 py-2 sm:py-3 overflow-x-hidden no-scrollbar ${className}`}
    >
      {/* Metaphor Header */}
      <div className="w-full max-w-[880px] flex flex-col gap-3 mb-4 pb-3 border-b border-[var(--mist)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-sans font-medium text-[var(--text-primary)] tracking-wide flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[var(--ink-bright)]" />
              CONCEPT STRATA: {propsTree.topic}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Geological progression: Bedrock foundations below support higher synthesis above.
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 font-mono text-[11px] text-[var(--text-secondary)] flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--stable-bright)]" /> Stable
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--cracked-bright)]" /> Cracked
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--ink-bright)]" /> Available
            </span>
            <span className="flex items-center gap-1.5 opacity-60">
              <span className="w-2 h-2 rounded-full bg-[var(--mist-100)]" /> Locked
            </span>
          </div>
        </div>

        {/* ── Interactive Toolbar: Search, Status Filter, Sort & Mastery Meter ── */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-[var(--mist)]/60">
          {/* Top Row: Search Input + Status Filter + Sort Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-xs text-[var(--text-tertiary)]">
                🔎
              </span>
              <input
                id="concept-strata-search"
                name="concept_strata_search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search concepts in strata..."
                aria-label="Search concepts in strata"
                autoComplete="off"
                className="w-full pl-7 pr-7 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--mist)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink-bright)] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1 bg-[var(--surface-2)] p-0.5 rounded-lg border border-[var(--mist)] text-xs">
              {(["all", "available", "stable", "cracked", "locked"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all capitalize cursor-pointer ${
                    statusFilter === st
                      ? "bg-[var(--surface-1)] text-[var(--text-primary)] font-bold shadow-xs border border-[var(--mist)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Sort Order Toggle */}
            <button
              type="button"
              onClick={() =>
                setSortOrder((prev: "geological" | "apex-first") =>
                  prev === "geological" ? "apex-first" : "geological"
                )
              }
              title="Toggle Strata Orientation"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--mist)] hover:border-[var(--ink-border)] text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer select-none"
            >
              <span>{sortOrder === "geological" ? "⬇️ Bedrock Base" : "⬆️ Apex Base"}</span>
            </button>
          </div>

          {/* Bottom Row: Mastery Progress Bar & Match Count */}
          <div className="flex items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <span className="text-[11px] text-[var(--text-secondary)] shrink-0">
                Mastery: <strong>{masteryPercentage}%</strong>
              </span>
              <div className="w-full bg-[var(--surface-2)] rounded-full h-1.5 overflow-hidden border border-[var(--mist)]">
                <div
                  className="bg-gradient-to-r from-[var(--ink-bright)] to-[var(--stable-bright)] h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${masteryPercentage}%` }}
                />
              </div>
            </div>

            <span className="text-[11px] text-[var(--text-tertiary)]">
              Showing {filteredNodesCount} of {totalNodesCount} nodes
            </span>
          </div>
        </div>
      </div>

      {/* Strata Layers */}
      <div className="w-full flex flex-col items-center relative">
        {orderedDepths.map((depth) => {
          const layerNodes = layers.get(depth) ?? [];
          return (
            <StrataLayer
              key={depth}
              depth={depth}
              maxDepth={maxDepth}
              nodes={layerNodes}
              nodeStatuses={nodeStatuses}
              activeNodeId={activeNodeId}
              onNodeClick={handleNodeClick}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
            />
          );
        })}
      </div>

      {/* ── Active Concept Node Inspector Panel ───────────────────────────── */}
      {activeNode && (
        <div className="w-full max-w-[880px] mt-4 p-4 rounded-xl border border-[var(--mist)] bg-[var(--surface-1)] shadow-xs transition-all">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[var(--mist)]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--ink-bright)]">
                Node Inspector
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--mist)] font-mono text-[var(--text-secondary)]">
                {activeNode.id}
              </span>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full capitalize font-semibold ${
                  (nodeStatuses[activeNode.id] ?? "locked") === "stable"
                    ? "bg-[var(--stable-subtle)] text-[var(--stable-bright)] border border-[var(--stable-border)]"
                    : (nodeStatuses[activeNode.id] ?? "locked") === "cracked"
                    ? "bg-[var(--cracked-subtle)] text-[var(--cracked-bright)] border border-[var(--cracked-border)]"
                    : (nodeStatuses[activeNode.id] ?? "locked") === "available"
                    ? "bg-[var(--ink-subtle)] text-[var(--ink-bright)] border border-[var(--ink-border)]"
                    : "bg-[var(--surface-2)] text-[var(--text-tertiary)] border border-[var(--mist)]"
                }`}
              >
                {nodeStatuses[activeNode.id] ?? "locked"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowInspector(!showInspector)}
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] font-mono cursor-pointer"
            >
              {showInspector ? "Hide Details ▲" : "Show Details ▼"}
            </button>
          </div>

          {showInspector && (
            <div className="space-y-3 pt-1">
              <div>
                <h4 className="text-base font-sans font-bold text-[var(--text-primary)]">
                  {activeNode.label}
                </h4>
                {activeNode.description && (
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                    {activeNode.description}
                  </p>
                )}
              </div>

              {/* Prerequisites and Downstream Dependencies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--mist)]/60 text-xs">
                {/* Prerequisites (Parents) */}
                <div>
                  <span className="font-mono text-[11px] text-[var(--text-tertiary)] block mb-1">
                    Prerequisites (Parent Nodes):
                  </span>
                  {parentNodes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {parentNodes.map((pn) => (
                        <button
                          key={pn.id}
                          type="button"
                          onClick={() => handleNodeClick(pn.id)}
                          className="px-2 py-0.5 rounded bg-[var(--surface-2)] hover:bg-[var(--surface-1)] border border-[var(--mist)] text-[var(--text-primary)] font-medium text-[11px] cursor-pointer transition-colors"
                          title={`Click to view ${pn.label}`}
                        >
                          ← {pn.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-[var(--text-secondary)] italic">
                      None (Foundational Bedrock Root)
                    </span>
                  )}
                </div>

                {/* Downstream (Children) */}
                <div>
                  <span className="font-mono text-[11px] text-[var(--text-tertiary)] block mb-1">
                    Unlocks Downstream (Child Nodes):
                  </span>
                  {childNodes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {childNodes.map((cn) => (
                        <button
                          key={cn.id}
                          type="button"
                          onClick={() => handleNodeClick(cn.id)}
                          className="px-2 py-0.5 rounded bg-[var(--surface-2)] hover:bg-[var(--surface-1)] border border-[var(--mist)] text-[var(--text-primary)] font-medium text-[11px] cursor-pointer transition-colors"
                          title={`Click to view ${cn.label}`}
                        >
                          → {cn.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-[var(--text-secondary)] italic">
                      Terminal Apex Concept
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ConceptTreeSkeleton
// Shimmer placeholder chips matching the final layout's dimensions,
// so nothing shifts when real content loads.
// ─────────────────────────────────────────────────────────────────────────────

export function ConceptTreeSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`concept-tree-skeleton w-full flex flex-col items-center px-4 py-6 ${className}`}
      role="status"
      aria-label="Loading concept tree strata"
    >
      {/* Metaphor Header Placeholder */}
      <div className="w-full max-w-[880px] flex items-center justify-between mb-4 pb-2 border-b border-[var(--mist)]">
        <div>
          <div className="h-4 w-60 bg-[var(--surface-2)] animate-pulse rounded mb-1.5" />
          <div className="h-3 w-80 max-w-full bg-[var(--surface-2)] animate-pulse rounded" />
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <div className="h-3 w-16 bg-[var(--surface-2)] animate-pulse rounded" />
          <div className="h-3 w-16 bg-[var(--surface-2)] animate-pulse rounded" />
        </div>
      </div>

      {/* Strata Layers Placeholder */}
      <div className="w-full flex flex-col items-center relative space-y-4">
        {/* Layer 3: Surface Layer (Apex) */}
        <div className="w-full flex flex-col items-center relative my-2" style={{ perspective: "800px" }}>
          <div className="w-full max-w-[880px] rounded-xl border border-[var(--mist)] bg-[var(--surface-1)] p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--mist)]">
              <div className="h-4 w-44 bg-[var(--surface-2)] rounded animate-pulse" />
              <div className="h-3 w-16 bg-[var(--surface-2)] rounded animate-pulse" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 py-2">
              <div className="h-9 w-48 rounded-full bg-[var(--surface-2)] animate-pulse border border-[var(--mist)]" />
            </div>
          </div>
        </div>

        {/* Layer 2: Intermediate Layer */}
        <div className="w-full flex flex-col items-center relative my-2" style={{ perspective: "800px" }}>
          <div className="w-full max-w-[880px] rounded-xl border border-[var(--mist)] bg-[var(--surface-1)] p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--mist)]">
              <div className="h-4 w-48 bg-[var(--surface-2)] rounded animate-pulse" />
              <div className="h-3 w-16 bg-[var(--surface-2)] rounded animate-pulse" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 py-2">
              <div className="h-9 w-52 rounded-full bg-[var(--surface-2)] animate-pulse border border-[var(--mist)]" />
              <div className="h-9 w-44 rounded-full bg-[var(--surface-2)] animate-pulse border border-[var(--mist)]" />
            </div>
          </div>
        </div>

        {/* Layer 1: Bedrock Foundation Layer */}
        <div className="w-full flex flex-col items-center relative my-2" style={{ perspective: "800px" }}>
          <div className="w-full max-w-[880px] rounded-xl border border-[var(--ink-border)]/40 bg-[var(--surface-1)] p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--mist)]">
              <div className="h-4 w-56 bg-[var(--surface-2)] rounded animate-pulse" />
              <div className="h-3 w-20 bg-[var(--surface-2)] rounded animate-pulse" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 py-2">
              <div className="h-9 w-56 rounded-full bg-[var(--surface-2)] animate-pulse border border-[var(--ink-border)]/40" />
              <div className="h-9 w-48 rounded-full bg-[var(--surface-2)] animate-pulse border border-[var(--ink-border)]/40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
