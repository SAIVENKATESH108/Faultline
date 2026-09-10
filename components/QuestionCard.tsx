"use client";

import React, { useState, useMemo, useEffect, useId } from "react";
import type { DiagnosticQuestionItem, ConceptTree } from "@/lib/types";
import { useRemediation } from "@/hooks/useRemediation";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface QuestionCardProps {
  /** The diagnostic question to display. If omitted, can resolve from tree. */
  question?: DiagnosticQuestionItem | null;
  /** The node ID this question assesses. If omitted, pulls activeNodeId from store. */
  nodeId?: string | null;
  /** Full tree reference used for unlockEligibleNodes when answered correctly. */
  tree?: ConceptTree | null;
  /** Optional callback on successful completion. */
  onSuccess?: () => void;
  /** Optional CSS class. */
  className?: string;
}

interface ChoiceOption {
  text: string;
  isCorrect: boolean;
  misconceptionId?: string;
  hash: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic Hash Helper (DJB2)
// Ensures answer choices remain in a stable shuffled order across re-renders.
// ─────────────────────────────────────────────────────────────────────────────

function deterministicHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// QuestionCard Component
// ─────────────────────────────────────────────────────────────────────────────

export default function QuestionCard({
  question: propsQuestion,
  nodeId: propsNodeId,
  tree: propsTree,
  onSuccess,
  className = "",
}: QuestionCardProps) {
  const componentId = useId();

  // Store integration
  const storeActiveNodeId = useAppStore((s) => s.activeNodeId);
  const setNodeStatus = useAppStore((s) => s.setNodeStatus);
  const unlockEligibleNodes = useAppStore((s) => s.unlockEligibleNodes);

  const activeNodeId = propsNodeId ?? storeActiveNodeId;
  const question = propsQuestion ?? propsTree?.question ?? null;

  // Local card flip & selection state
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [selectedMisconception, setSelectedMisconception] = useState<string | null>(null);
  const [selectedChoiceText, setSelectedChoiceText] = useState<string | null>(null);

  // Remediation mutation
  const {
    mutate: fetchRemediation,
    data: remediationData,
    isPending: isRemediationLoading,
    isError: isRemediationError,
    error: remediationError,
    reset: resetRemediation,
  } = useRemediation();

  // Stream / Typewriter effect state for remediation explanation
  const [streamedExplanation, setStreamedExplanation] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  // Reset card state if the evaluated node changes
  useEffect(() => {
    setIsFlipped(false);
    setIsCorrect(false);
    setSelectedMisconception(null);
    setSelectedChoiceText(null);
    setStreamedExplanation("");
    resetRemediation();
  }, [activeNodeId, resetRemediation]);

  // Stable shuffled options via deterministic hash
  const shuffledChoices = useMemo<ChoiceOption[]>(() => {
    if (!question) return [];

    const options: ChoiceOption[] = [
      {
        text: question.correctAnswer,
        isCorrect: true,
        misconceptionId: undefined,
        hash: deterministicHash(`correct:${question.stem}:${question.correctAnswer}`),
      },
      ...question.distractors.map((d) => ({
        text: d.text,
        isCorrect: false,
        misconceptionId: d.misconceptionId,
        hash: deterministicHash(`distractor:${question.stem}:${d.text}`),
      })),
    ];

    // Sort by deterministic hash so order never changes across re-renders
    return options.sort((a, b) => a.hash - b.hash);
  }, [question]);

  // Stream explanation character-by-character when remediation completes
  useEffect(() => {
    if (!remediationData?.explanation) return;

    const fullText = remediationData.explanation;
    let currentIndex = 0;
    setStreamedExplanation("");
    setIsStreaming(true);

    const timer = setInterval(() => {
      currentIndex += 2;
      if (currentIndex >= fullText.length) {
        setStreamedExplanation(fullText);
        setIsStreaming(false);
        clearInterval(timer);
      } else {
        setStreamedExplanation(fullText.slice(0, currentIndex));
      }
    }, 18);

    return () => {
      clearInterval(timer);
      setIsStreaming(false);
    };
  }, [remediationData?.explanation]);

  // Handle option selection
  const handleSelectChoice = (choice: ChoiceOption) => {
    setSelectedChoiceText(choice.text);

    if (choice.isCorrect) {
      // Correct Answer: No flip occurs, show inline success state, update store
      setIsCorrect(true);
      if (activeNodeId) {
        setNodeStatus(activeNodeId, "stable");
        if (propsTree) {
          unlockEligibleNodes(propsTree);
        }
      }
      onSuccess?.();
    } else {
      // Wrong Answer: Trigger 3D flip, mark node 'cracked', call useRemediation
      const misconceptionId = choice.misconceptionId ?? "misconception-general";
      setSelectedMisconception(misconceptionId);
      setIsFlipped(true);

      if (activeNodeId) {
        setNodeStatus(activeNodeId, "cracked");
        fetchRemediation({
          nodeId: activeNodeId,
          misconceptionId,
        });
      }
    }
  };

  // Handle "Try again" action
  const handleTryAgain = () => {
    // Flip card back to front and reset selection state
    setIsFlipped(false);
    setSelectedMisconception(null);
    setSelectedChoiceText(null);
    setStreamedExplanation("");
    resetRemediation();
  };

  // Empty state if no question
  if (!question) {
    return (
      <div
        className={`w-full max-w-2xl mx-auto p-8 rounded-2xl border border-dashed border-[var(--mist)] bg-[var(--surface-1)] text-center shadow-xs my-0 ${className}`}
      >
        <div className="text-sm font-sans font-semibold text-[var(--text-secondary)] mb-1">
          No Diagnostic Question Active
        </div>
        <p className="text-xs text-[var(--text-tertiary)] font-mono">
          Select an available concept node in the strata to test understanding.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`question-card-wrapper w-full max-w-2xl mx-auto my-0 overflow-x-hidden no-scrollbar ${className}`}
      style={{ perspective: "1200px" }}
    >
      {/* 3D Flip Card Container */}
      <div
        className="relative w-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          minHeight: "480px",
        }}
      >
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* FRONT FACE                                                          */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div
          className="w-full min-h-[480px] rounded-2xl border border-[var(--mist)] bg-[var(--surface-1)] p-6 sm:p-7 flex flex-col justify-between shadow-md transition-all duration-300 overflow-x-hidden no-scrollbar"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(0deg)",
            opacity: isFlipped ? 0 : 1,
            pointerEvents: isFlipped ? "none" : "auto",
            visibility: isFlipped ? "hidden" : "visible",
            zIndex: isFlipped ? 1 : 2,
            transition: `opacity 250ms ease, visibility 0s linear ${isFlipped ? "250ms" : "0s"}`,
          }}
        >
          {/* Header */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--mist)]">
              <span className="font-mono text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--ink-bright)] animate-pulse" />
                DIAGNOSTIC PROBE
              </span>

              {isCorrect && (
                <Badge variant="stable" size="sm">
                  STABLE • VERIFIED
                </Badge>
              )}
            </div>

            {/* Question Prompt */}
            <h4 className="text-lg sm:text-xl font-sans font-semibold text-[var(--text-primary)] leading-relaxed mb-6">
              {question.stem}
            </h4>
          </div>

          {/* Answer Choices rendered as buttons */}
          <div className="grid grid-cols-1 gap-3 my-4">
            {shuffledChoices.map((choice, idx) => {
              const optionLabel = String.fromCharCode(65 + idx); // A, B, C, D
              const isSelected = selectedChoiceText === choice.text;

              let buttonVariant: "secondary" | "danger" = "secondary";
              let customStyle: React.CSSProperties = {
                justifyContent: "flex-start",
                textAlign: "left",
                padding: "0.875rem 1rem",
                height: "auto",
                lineHeight: 1.45,
                whiteSpace: "normal",
                wordBreak: "break-word",
                backgroundColor: "var(--surface-2)",
                borderColor: "var(--mist)",
                color: "var(--text-primary)",
              };

              if (isCorrect && choice.isCorrect) {
                customStyle = {
                  ...customStyle,
                  backgroundColor: "var(--stable-subtle)",
                  borderColor: "var(--stable-border)",
                  color: "var(--stable-bright)",
                  fontWeight: 600,
                };
              } else if (isSelected && !choice.isCorrect) {
                buttonVariant = "danger";
              }

              return (
                <Button
                  key={`${componentId}-choice-${idx}`}
                  variant={buttonVariant}
                  onClick={() => handleSelectChoice(choice)}
                  disabled={isCorrect || isFlipped}
                  style={customStyle}
                  className="group transition-all text-left hover:border-[var(--ink-border)] hover:bg-[var(--ink-subtle)]"
                >
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--surface-1)] text-[var(--text-primary)] border border-[var(--mist)] group-hover:border-[var(--ink-border)] mr-2 shrink-0">
                    {optionLabel}
                  </span>
                  <span className="font-sans text-sm sm:text-base font-medium flex-1 text-[var(--text-primary)]">
                    {choice.text}
                  </span>
                </Button>
              );
            })}
          </div>

          {/* Inline Success State on Correct Answer */}
          {isCorrect && (
            <div className="mt-4 p-4 rounded-xl border border-[var(--stable-border)] bg-[var(--stable-subtle)] animate-fade-in">
              <div className="flex items-center gap-2 text-[var(--stable-bright)] font-sans font-bold text-sm mb-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Mastery Confirmed: Concept Stabilized
              </div>
              <p className="text-xs text-[var(--stable-fg)] font-sans leading-relaxed">
                {question.explanation ||
                  "Your answer aligns with foundational principles. Downstream dependent concept nodes have now unlocked."}
              </p>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* BACK FACE (Revealed on Wrong Answer via 3D Flip)                    */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div
          className="absolute inset-0 w-full min-h-[480px] rounded-2xl border-2 border-[var(--fracture-border)] bg-[var(--surface-1)] p-6 sm:p-7 flex flex-col justify-between shadow-2xl transition-all duration-300 overflow-x-hidden no-scrollbar"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            opacity: isFlipped ? 1 : 0,
            pointerEvents: isFlipped ? "auto" : "none",
            visibility: isFlipped ? "visible" : "hidden",
            zIndex: isFlipped ? 2 : 1,
            transition: `opacity 250ms ease, visibility 0s linear ${isFlipped ? "0s" : "250ms"}`,
          }}
        >
          {/* Top content area with smooth internal scrolling if needed */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pr-1">
            {/* Misconception Badge Header */}
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--mist)]">
              <span className="font-mono text-xs font-bold text-[var(--text-secondary)] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--fracture-bright)]" />
                MISCONCEPTION DIAGNOSED
              </span>

              {selectedMisconception && (
                <Badge variant="fracture" size="md">
                  {selectedMisconception}
                </Badge>
              )}
            </div>

            {/* Error state if remediation fails */}
            {isRemediationError ? (
              <div className="py-6 px-4 rounded-xl border border-[var(--fracture-border)] bg-[var(--fracture-subtle)] text-center my-4">
                <div className="text-xs font-mono font-bold text-[var(--fracture-bright)] uppercase tracking-wider mb-1.5">
                  Remediation Failed
                </div>
                <p className="text-xs text-[var(--fracture-fg)] font-sans mb-4 leading-relaxed font-medium">
                  {remediationError?.message || "Unable to diagnose this misconception. Please check connection and retry."}
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (activeNodeId && selectedMisconception) {
                      fetchRemediation({
                        nodeId: activeNodeId,
                        misconceptionId: selectedMisconception,
                      });
                    }
                  }}
                  className="focus-visible:ring-2 focus-visible:ring-[var(--fracture-bright)]"
                >
                  Retry Analysis
                </Button>
              </div>
            ) : isRemediationLoading ? (
              /* Loading Shimmer Skeleton matching exact diagnosis + counter-puzzle dimensions */
              <div className="space-y-5 py-4" role="status" aria-label="Diagnosing misconception">
                <div>
                  <div className="h-3.5 w-44 rounded bg-[var(--surface-2)] animate-pulse mb-3" />
                  <div className="space-y-2">
                    <div className="h-4 rounded bg-[var(--surface-2)] animate-pulse w-full" />
                    <div className="h-4 rounded bg-[var(--surface-2)] animate-pulse w-11/12" />
                    <div className="h-4 rounded bg-[var(--surface-2)] animate-pulse w-4/5" />
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--mist)] space-y-2.5">
                  <div className="h-3.5 w-56 rounded bg-[var(--surface-2)] animate-pulse mb-3" />
                  <div className="h-4 rounded bg-[var(--surface-2)] animate-pulse w-full" />
                  <div className="h-4 rounded bg-[var(--surface-2)] animate-pulse w-5/6" />
                </div>
              </div>
            ) : (
              /* Diagnosis & Counter-Puzzle Content */
              <div className="space-y-4 py-2">
                <div>
                  <div className="font-mono text-xs uppercase tracking-wider text-[var(--fracture-bright)] font-bold mb-1.5 flex items-center gap-1.5">
                    <span>Diagnosis &amp; Correction</span>
                    {isStreaming && (
                      <span className="inline-block w-1.5 h-3.5 bg-[var(--fracture-bright)] animate-pulse" />
                    )}
                  </div>
                  <p className="font-sans text-sm sm:text-base text-[var(--text-primary)] leading-relaxed font-medium">
                    {streamedExplanation ||
                      remediationData?.explanation ||
                      "Analyzing the cognitive rupture in this concept..."}
                  </p>
                </div>

                {/* Counter-puzzle / Actionable study steps */}
                {remediationData?.resources && remediationData.resources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[var(--mist)]">
                    <div className="font-mono text-xs uppercase tracking-wider text-[var(--text-secondary)] font-bold mb-2">
                      Counter-Puzzle &amp; Cognitive Anchors
                    </div>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-[var(--text-secondary)] font-sans list-disc list-inside font-medium">
                      {remediationData.resources.map((res, i) => (
                        <li key={`${componentId}-res-${i}`} className="leading-relaxed">
                          {res}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sticky footer action: flips back to front and resets selection state */}
          <div className="pt-3 mt-4 border-t border-[var(--mist)] flex justify-end shrink-0">
            <Button
              variant="outline"
              size="md"
              onClick={handleTryAgain}
              className="px-4 py-2 bg-[var(--surface-2)] hover:bg-[var(--surface-1)] hover:border-[var(--ink-border)] text-[var(--text-primary)] font-semibold shadow-xs"
            >
              <span className="mr-1.5">🔄</span>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
