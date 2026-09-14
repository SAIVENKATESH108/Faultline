"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import ConceptTree, { ConceptTreeSkeleton } from "@/components/ConceptTree";
import QuestionCard from "@/components/QuestionCard";
import { Button } from "@/components/ui/Button";
import { useConceptTree } from "@/hooks/useConceptTree";
import { useAppStore } from "@/store/useAppStore";

// Curated quick-starter topics
const SUGGESTED_TOPICS = [
  { label: "Pointer Arithmetic in C", tag: "C/Systems", isDemo: true },
  { label: "Binary Search Trees", tag: "Algorithms" },
  { label: "Memory Management in Python", tag: "Python" },
  { label: "Transformer Self-Attention", tag: "AI/ML" },
  { label: "JavaScript Event Loop", tag: "Web" },
];

function StrataContent() {
  const searchParams = useSearchParams();
  const initialTopic = searchParams.get("topic") || "";

  // Local state for input field and submitted topic
  const [inputTopic, setInputTopic] = useState(initialTopic);
  const [submittedTopic, setSubmittedTopic] = useState(initialTopic);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Sync if topic parameter in URL changes
  useEffect(() => {
    const topicParam = searchParams.get("topic");
    if (topicParam && topicParam !== submittedTopic) {
      setInputTopic(topicParam);
      setSubmittedTopic(topicParam);
    }
  }, [searchParams, submittedTopic]);

  // React Query hook for fetching concept tree
  const {
    data: tree,
    isLoading,
    isError,
    error,
    refetch,
  } = useConceptTree(submittedTopic);

  // Zustand app store
  const activeNodeId = useAppStore((s) => s.activeNodeId);
  const nodeStatuses = useAppStore((s) => s.nodeStatuses);
  const setActiveTopic = useAppStore((s) => s.setActiveTopic);
  const setActiveNode = useAppStore((s) => s.setActiveNode);
  const resetNodeStatuses = useAppStore((s) => s.resetNodeStatuses);
  const unlockEligibleNodes = useAppStore((s) => s.unlockEligibleNodes);

  // Synchronize store when a new tree is loaded
  useEffect(() => {
    if (tree && tree.nodes && tree.nodes.length > 0) {
      // Initialize statuses to 'locked' then unlock root
      resetNodeStatuses(tree.nodes.map((n) => n.id));
      unlockEligibleNodes(tree);

      // Auto-select root node (no parentIds)
      const rootNode =
        tree.nodes.find((n) => !n.parentIds || n.parentIds.length === 0) ||
        tree.nodes[0];

      if (rootNode) {
        setActiveNode(rootNode.id);
      }
    }
  }, [tree, resetNodeStatuses, unlockEligibleNodes, setActiveNode]);

  // Handle "Build" submission
  const handleBuild = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputTopic.trim();
    if (!clean) return;

    setSubmittedTopic(clean);
    setActiveTopic(clean);
  };

  // Quick select topic
  const handleSelectTopic = useCallback((topic: string) => {
    setInputTopic(topic);
    setSubmittedTopic(topic);
    setActiveTopic(topic);
  }, [setActiveTopic]);

  // Load pre-baked demo fixture
  const handleLoadDemo = useCallback(
    (e?: React.MouseEvent | React.KeyboardEvent) => {
      if (e) e.preventDefault();
      handleSelectTopic("Pointer Arithmetic in C");
    },
    [handleSelectTopic]
  );

  // Reset progress on current tree
  const handleResetProgress = () => {
    if (!tree?.nodes) return;
    resetNodeStatuses(tree.nodes.map((n) => n.id));
    unlockEligibleNodes(tree);
    const rootNode =
      tree.nodes.find((n) => !n.parentIds || n.parentIds.length === 0) ||
      tree.nodes[0];
    if (rootNode) setActiveNode(rootNode.id);
  };

  // Derived active node
  const activeNode =
    tree?.nodes.find((n) => n.id === activeNodeId) ||
    tree?.nodes[0] ||
    null;

  // Stats calculation
  const totalNodesCount = tree?.nodes.length ?? 0;
  const stableCount = Object.values(nodeStatuses).filter((s) => s === "stable").length;
  const crackedCount = Object.values(nodeStatuses).filter((s) => s === "cracked").length;

  // Copy Markdown Learning Report to clipboard
  const handleCopyMarkdownReport = () => {
    if (!tree) return;
    const masteredNodes = tree.nodes.filter((n) => (nodeStatuses[n.id] ?? "locked") === "stable");
    const inProgressNodes = tree.nodes.filter((n) => (nodeStatuses[n.id] ?? "locked") === "cracked");

    const report = `# Faultline Learning Report: ${tree.topic}
*Generated on ${new Date().toLocaleDateString()} via Faultline Adaptive Strata*

## Mastery Progress: ${stableCount}/${totalNodesCount} (${Math.round((stableCount / Math.max(1, totalNodesCount)) * 100)}%)

### ✅ Mastered Concepts:
${masteredNodes.length > 0 ? masteredNodes.map((n) => `- **${n.label}**: ${n.description || "Foundational competency achieved."}`).join("\n") : "_No concepts stabilized yet._"}

### ⚡ Needs Reinforcement / In Progress:
${inProgressNodes.length > 0 ? inProgressNodes.map((n) => `- **${n.label}**: Misconceptions diagnosed; review counter-puzzles.`).join("\n") : "_No active misconceptions pending._"}

---
*Built with Faultline • Powered by Gemini 3.5 Lite*`;

    navigator.clipboard.writeText(report).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    });
  };

  // Download JSON export
  const handleDownloadJSON = () => {
    if (!tree) return;
    const exportData = {
      topic: tree.topic,
      exportedAt: new Date().toISOString(),
      stats: {
        total: totalNodesCount,
        mastered: stableCount,
        cracked: crackedCount,
      },
      nodes: tree.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        description: n.description,
        status: nodeStatuses[n.id] ?? "locked",
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faultline-${tree.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] selection:bg-[var(--ink-bright)] selection:text-white flex flex-col overflow-x-hidden no-scrollbar w-full transition-colors duration-200">
      {/* ── Skip to Content Link for Screen Readers & Keyboard Navigation ──── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--ink-bright)] focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--ink-bright)]"
      >
        Skip to main content
      </a>

      {/* ── Global Top Navbar ──────────────────────────────────────────────── */}
      <Navbar activeRoute="/strata" />

      {/* ── Topic Search & Strata Generator Banner ─────────────────────────── */}
      <div className="w-full border-b border-[var(--mist)] bg-[var(--surface-1)] py-3 px-4 sm:px-6 lg:px-8 shrink-0 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search & Build Form */}
          <form
            onSubmit={handleBuild}
            className="w-full md:max-w-2xl flex items-center gap-2"
            role="search"
            aria-label="Concept tree generator"
          >
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-tertiary)] text-xs">
                🔍
              </span>
              <label htmlFor="topic-input" className="sr-only">
                Topic to build concept strata for
              </label>
              <input
                id="topic-input"
                name="topic_input"
                autoComplete="off"
                type="text"
                value={inputTopic}
                onChange={(e) => setInputTopic(e.target.value)}
                placeholder="Enter topic to synthesize cognitive strata (e.g., Quantum Computing, Neural Networks)..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--mist)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink-bright)] transition-all"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              isLoading={isLoading}
              disabled={isLoading || !inputTopic.trim()}
              className="shrink-0 h-9 px-4 font-semibold text-xs sm:text-sm shadow-xs"
            >
              ⚡ Synthesize Strata
            </Button>
          </form>

          {/* Quick fixture button & link to Live Doctor */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end shrink-0">
            <button
              type="button"
              onClick={handleLoadDemo}
              title="Load pre-baked Pointer Arithmetic in C demo fixture"
              className="shrink-0 text-xs text-[var(--text-secondary)] hover:text-[var(--ink-bright)] font-mono border border-[var(--mist)] hover:border-[var(--ink-border)] bg-[var(--surface-2)] px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 select-none shadow-xs"
            >
              <span>📂</span>
              <span className="hidden sm:inline">Fixture:</span>
              <span className="font-sans font-medium">Pointer in C</span>
            </button>
            <Link
              href="/terminal"
              className="shrink-0 text-xs text-[var(--ink-bright)] font-mono border border-[var(--ink-border)]/50 bg-[var(--ink-subtle)] px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 select-none font-semibold shadow-xs hover:bg-[var(--ink-muted)]"
            >
              <span>💻</span>
              <span>Live Code Doctor</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Quick Topic Suggestions Strip ─────────────────────────────────── */}
      <div className="w-full border-b border-[var(--mist)] bg-[var(--surface-1)]/70 backdrop-blur-xs py-1.5 px-4 sm:px-6 lg:px-8 shrink-0">
        <div className="max-w-[1600px] mx-auto flex items-center gap-2.5 overflow-x-auto no-scrollbar text-xs font-mono">
          <span className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider shrink-0 flex items-center gap-1">
            <span>💡</span> Explore:
          </span>
          <div className="flex items-center gap-2 flex-nowrap shrink-0">
            {SUGGESTED_TOPICS.map((st) => (
              <button
                key={st.label}
                type="button"
                onClick={() => handleSelectTopic(st.label)}
                className={`px-2.5 py-1 rounded-full border text-[11px] transition-all cursor-pointer select-none flex items-center gap-1.5 ${
                  submittedTopic === st.label
                    ? "bg-[var(--ink-bright)] text-white border-[var(--ink-border)] font-semibold shadow-xs"
                    : "bg-[var(--surface-2)] border-[var(--mist)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--ink-border)]"
                }`}
              >
                <span>{st.label}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--surface-1)] text-[var(--text-tertiary)] border border-[var(--mist)]">
                  {st.tag}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      <main id="main-content" className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 w-full flex flex-col overflow-x-hidden no-scrollbar">
        {/* Loading State with Skeletons matching exact layout dimensions */}
        {isLoading && (
          <div className="space-y-6 animate-fade-in w-full" role="status" aria-live="polite">
            {/* Status bar placeholder */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 rounded-xl bg-[var(--surface-1)] border border-[var(--mist)] shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--ink-bright)] animate-ping" />
                <span className="text-sm font-medium font-sans text-[var(--text-primary)]">
                  Synthesizing concept strata with Gemini for &ldquo;{submittedTopic}&rdquo;...
                </span>
              </div>
              <span className="text-xs font-mono text-[var(--text-secondary)]">
                Mapping bedrock prerequisites &amp; diagnostic probes
              </span>
            </div>

            {/* Skeletons in identical 2-column grid to prevent any layout shift */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full">
              {/* Concept Tree Shimmer Skeleton */}
              <section className="lg:col-span-7 flex flex-col w-full min-w-0" aria-label="Loading strata">
                <ConceptTreeSkeleton />
              </section>

              {/* Question Card Shimmer Skeleton */}
              <section className="lg:col-span-5 flex flex-col sticky top-20 w-full min-w-0" aria-label="Loading probe">
                <div className="w-full flex items-center justify-between mb-4 pb-2 border-b border-[var(--mist)]">
                  <div className="h-4 w-36 bg-[var(--surface-2)] animate-pulse rounded" />
                  <div className="h-3 w-20 bg-[var(--surface-2)] animate-pulse rounded" />
                </div>
                <div className="w-full max-w-2xl mx-auto my-0 p-6 sm:p-7 rounded-2xl border border-[var(--mist)] bg-[var(--surface-1)] shadow-md min-h-[480px] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--mist)]">
                      <div className="h-3 w-32 bg-[var(--surface-2)] animate-pulse rounded" />
                      <div className="h-4 w-20 bg-[var(--surface-2)] animate-pulse rounded-full" />
                    </div>
                    <div className="space-y-2 mb-6">
                      <div className="h-5 w-full bg-[var(--surface-2)] animate-pulse rounded" />
                      <div className="h-5 w-4/5 bg-[var(--surface-2)] animate-pulse rounded" />
                    </div>
                  </div>

                  <div className="space-y-3 my-4">
                    <div className="h-12 w-full rounded-lg bg-[var(--surface-2)] border border-[var(--mist)] animate-pulse" />
                    <div className="h-12 w-full rounded-lg bg-[var(--surface-2)] border border-[var(--mist)] animate-pulse" />
                    <div className="h-12 w-full rounded-lg bg-[var(--surface-2)] border border-[var(--mist)] animate-pulse" />
                    <div className="h-12 w-full rounded-lg bg-[var(--surface-2)] border border-[var(--mist)] animate-pulse" />
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* Error State with Retry Button */}
        {isError && (
          <div
            className="p-8 rounded-2xl border border-[var(--fracture-border)] bg-[var(--fracture-subtle)] text-center my-8 max-w-2xl mx-auto"
            role="alert"
          >
            <div className="w-10 h-10 rounded-full bg-[var(--fracture-subtle)] border border-[var(--fracture-border)] mx-auto flex items-center justify-center mb-3">
              <span className="text-lg">⚠️</span>
            </div>
            <h2 className="text-base font-sans font-semibold text-[var(--text-primary)] mb-1">
              Unable to Build Topic
            </h2>
            <p className="text-sm text-[var(--fracture-fg)] font-sans mb-5 max-w-md mx-auto leading-relaxed">
              {error?.message || "Couldn't build that topic, try rephrasing or check your GEMINI_API_KEY."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="danger"
                size="md"
                onClick={() => refetch()}
                className="focus-visible:ring-2 focus-visible:ring-[var(--fracture-bright)]"
              >
                🔄 Retry
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={handleLoadDemo}
                className="focus-visible:ring-2 focus-visible:ring-[var(--ink-bright)]"
              >
                📂 Load Pre-Baked Demo
              </Button>
            </div>
          </div>
        )}

        {/* Initial Empty Welcome State (Before any tree is loaded) */}
        {!tree && !isLoading && !isError && (
          <div className="my-auto py-12 px-6 sm:px-12 rounded-3xl border border-[var(--mist)] bg-[var(--surface-1)] text-center max-w-3xl mx-auto shadow-sm">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--ink-subtle)] border border-[var(--ink-border)]/40 flex items-center justify-center text-2xl">
              🌋
            </div>
            <h2 className="text-xl sm:text-2xl font-sans font-bold text-[var(--text-primary)] mb-2">
              Explore Concept Strata
            </h2>
            <p className="text-sm text-[var(--text-secondary)] max-w-lg mx-auto mb-6 leading-relaxed">
              Enter any domain, skill, or topic to synthesize cognitive layers from foundational
              bedrock prerequisites to emergent apex concepts. Powered by Gemini 3.5 Lite.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="primary"
                onClick={handleLoadDemo}
                className="focus-visible:ring-2 focus-visible:ring-[var(--ink-bright)]"
              >
                ⚡ Load Pre-Baked Demo: Pointer in C
              </Button>
            </div>
          </div>
        )}

        {/* Tree Loaded State: ConceptTree + QuestionCard */}
        {tree && !isLoading && (
          <div className="space-y-6 w-full">
            {/* Status & Topic Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 rounded-xl bg-[var(--surface-1)] border border-[var(--mist)] shadow-xs">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded bg-[var(--ink-subtle)] text-[var(--ink-bright)] border border-[var(--ink-border)]/60 text-xs font-mono font-bold uppercase tracking-wider">
                  Active Topic
                </span>
                <span className="text-base font-bold font-sans text-[var(--text-primary)] tracking-tight">
                  {tree.topic}
                </span>
              </div>

              {/* Center/Right: Progress Counters + Quick Actions */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--mist)] text-[var(--text-secondary)]">
                  <span>Total:</span>
                  <strong className="text-[var(--text-primary)] font-semibold">{totalNodesCount}</strong>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--stable-subtle)] border border-[var(--stable-border)]/60 text-[var(--stable-bright)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--stable-bright)]" />
                  <span>Mastered:</span>
                  <strong className="font-semibold">{stableCount}</strong>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--cracked-subtle)] border border-[var(--cracked-border)]/60 text-[var(--cracked-bright)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--cracked-bright)]" />
                  <span>Cracked:</span>
                  <strong className="font-semibold">{crackedCount}</strong>
                </div>

                {/* Strata Actions: Reset & Report */}
                <div className="flex items-center gap-2 ml-1">
                  <button
                    type="button"
                    onClick={handleResetProgress}
                    title="Reset mastery progress to retake this tree"
                    className="px-2.5 py-1 rounded-lg border border-[var(--mist)] bg-[var(--surface-2)] hover:bg-[var(--surface-1)] hover:border-[var(--ink-border)] text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <span>↺</span>
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReportOpen(true)}
                    title="View learning summary report and export progress"
                    className="px-2.5 py-1 rounded-lg border border-[var(--ink-border)] bg-[var(--ink-subtle)] hover:bg-[var(--ink-muted)] text-[11px] font-mono text-[var(--ink-bright)] font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <span>📊</span>
                    <span>Report &amp; Export</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Split Layout: ConceptTree (Left) & QuestionCard (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full">
              {/* Concept Tree: Geological horizontal strata */}
              <section
                className="lg:col-span-7 flex flex-col w-full min-w-0"
                aria-label="Concept strata visualization"
              >
                <ConceptTree
                  tree={tree}
                  activeNodeId={activeNodeId}
                  onNodeSelect={(nodeId) => setActiveNode(nodeId)}
                />
              </section>

              {/* QuestionCard Column: Active Node Probe */}
              <section
                className="lg:col-span-5 flex flex-col sticky top-20 w-full min-w-0"
                aria-label="Diagnostic question and remediation probe"
              >
                {/* Aligned Metaphor Header matching ConceptTree */}
                <div className="w-full flex items-center justify-between mb-4 pb-2 border-b border-[var(--mist)]">
                  <div>
                    <h3 className="text-sm font-sans font-medium text-[var(--text-primary)] tracking-wide flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[var(--fracture-bright)]" />
                      DIAGNOSTIC PROBE
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Target Concept: <span className="font-semibold text-[var(--ink-bright)]">{activeNode?.label || "Select a node"}</span>
                    </p>
                  </div>
                  <div className="font-mono text-[11px] text-[var(--text-tertiary)] uppercase">
                    {activeNodeId || "None"}
                  </div>
                </div>

                <QuestionCard
                  question={tree.question}
                  nodeId={activeNodeId}
                  tree={tree}
                />
              </section>
            </div>
          </div>
        )}
      </main>

      {/* ── Learning Report & Export Modal ─────────────────────────────────── */}
      {isReportOpen && tree && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
        >
          <div className="relative w-full max-w-2xl bg-[var(--surface-1)] border border-[var(--mist)] rounded-2xl shadow-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto no-scrollbar flex flex-col justify-between">
            {/* Modal Header */}
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--mist)]">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-[var(--ink-bright)]" />
                  <h3 id="report-modal-title" className="text-lg font-sans font-bold text-[var(--text-primary)]">
                    Cognitive Strata Report: {tree.topic}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReportOpen(false)}
                  className="w-8 h-8 rounded-lg border border-[var(--mist)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-primary)] flex items-center justify-center text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="space-y-4 py-1 text-sm font-sans">
                {/* Score Card */}
                <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--mist)] text-center">
                  <div>
                    <div className="text-xl font-extrabold text-[var(--text-primary)] font-mono">{totalNodesCount}</div>
                    <div className="text-[11px] text-[var(--text-secondary)] uppercase">Total Nodes</div>
                  </div>
                  <div>
                    <div className="text-xl font-extrabold text-[var(--stable-bright)] font-mono">{stableCount}</div>
                    <div className="text-[11px] text-[var(--text-secondary)] uppercase">Mastered</div>
                  </div>
                  <div>
                    <div className="text-xl font-extrabold text-[var(--cracked-bright)] font-mono">{crackedCount}</div>
                    <div className="text-[11px] text-[var(--text-secondary)] uppercase">Cracked</div>
                  </div>
                </div>

                {/* Mastered Concepts */}
                <div>
                  <h4 className="font-mono text-xs uppercase tracking-wider text-[var(--stable-bright)] font-bold mb-2">
                    ✅ Mastered Competencies ({stableCount})
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                    {tree.nodes
                      .filter((n) => (nodeStatuses[n.id] ?? "locked") === "stable")
                      .map((n) => (
                        <div key={n.id} className="p-2.5 rounded-lg bg-[var(--stable-subtle)] border border-[var(--stable-border)]/50 text-xs">
                          <div className="font-bold text-[var(--text-primary)]">{n.label}</div>
                          <div className="text-[var(--text-secondary)] mt-0.5">{n.description || "Foundational competency achieved."}</div>
                        </div>
                      ))}
                    {stableCount === 0 && (
                      <p className="text-xs text-[var(--text-tertiary)] italic">No concept nodes stabilized yet. Complete diagnostic probes to advance.</p>
                    )}
                  </div>
                </div>

                {/* Actionable Misconceptions */}
                {crackedCount > 0 && (
                  <div>
                    <h4 className="font-mono text-xs uppercase tracking-wider text-[var(--cracked-bright)] font-bold mb-2">
                      ⚡ Identified Cognitive Ruptures ({crackedCount})
                    </h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                      {tree.nodes
                        .filter((n) => (nodeStatuses[n.id] ?? "locked") === "cracked")
                        .map((n) => (
                          <div key={n.id} className="p-2.5 rounded-lg bg-[var(--cracked-subtle)] border border-[var(--cracked-border)]/50 text-xs">
                            <div className="font-bold text-[var(--text-primary)]">{n.label}</div>
                            <div className="text-[var(--cracked-bright)] mt-0.5">Misconception diagnosed in diagnostic probe. Re-test to stabilize.</div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 mt-5 border-t border-[var(--mist)] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCopyMarkdownReport}
                  className="flex items-center gap-1.5"
                >
                  <span>{copySuccess ? "✓ Copied Markdown!" : "📋 Copy Cheat Sheet"}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadJSON}
                  className="flex items-center gap-1.5"
                >
                  <span>📥 Export JSON</span>
                </Button>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsReportOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StrataPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--surface-0)] flex items-center justify-center text-[var(--text-secondary)] font-mono text-sm">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-[var(--ink-bright)] border-t-transparent rounded-full animate-spin" />
            <span>Loading Cognitive Strata...</span>
          </div>
        </div>
      }
    >
      <StrataContent />
    </Suspense>
  );
}
