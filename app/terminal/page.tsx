"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { CodeDiagnosisResponse } from "@/lib/validation/code-diagnosis-schema";
import type { CompileResponse, SupportedLanguage } from "@/lib/services/compiler/types";

// ─────────────────────────────────────────────────────────────────────────────
// Preset Cognitive Challenges
// ─────────────────────────────────────────────────────────────────────────────

interface Challenge {
  id: string;
  title: string;
  language: SupportedLanguage;
  tag: string;
  prompt: string;
  defaultStdin: string;
  initialCode: string;
  expectedOutcome: string;
}

const CHALLENGES: Challenge[] = [
  {
    id: "pointer-scaling-c",
    title: "Pointer Arithmetic Scaling (C)",
    language: "c",
    tag: "Memory & Pointers",
    prompt:
      "Task: Read a target index from stdin and access that integer using pointer arithmetic. Notice how byte offset vs type-scaled offset corrupts memory.",
    defaultStdin: "2",
    initialCode: `#include <stdio.h>

int main() {
    int arr[] = {10, 20, 30, 40, 50};
    int *ptr = arr;

    int index = 0;
    if (scanf("%d", &index) != 1) {
        index = 2; // fallback
    }

    // Cognitive Mistake: Multiplying by sizeof(int) manually.
    // In C, pointer + 1 already advances by sizeof(type) bytes!
    int value = *(ptr + (index * sizeof(int)));

    printf("Array target at index %d is: %d\\n", index, value);
    return 0;
}`,
    expectedOutcome: "Correctly access index 2 (value 30) without multiplying by sizeof(int)",
  },
  {
    id: "shallow-copy-py",
    title: "Mutable Default Argument Trap (Python)",
    language: "python",
    tag: "Memory & References",
    prompt:
      "Task: Create independent shopping lists with user input. Notice how mutable default arguments share state across invocations.",
    defaultStdin: "Oranges",
    initialCode: `import sys

def add_item(item, basket=[]):
    # Trap: mutable default argument 'basket' is instantiated once at def time,
    # causing subsequent calls to pollute the same underlying list in memory!
    basket.append(item)
    return basket

user_input = sys.stdin.read().strip() or "Oranges"

cart1 = add_item("Apples")
cart2 = add_item(user_input)

print("Cart 1:", cart1)
print("Cart 2:", cart2) # Unexpectedly contains both Apples and Oranges!`,
    expectedOutcome: "cart2 should only contain ['Oranges']",
  },
  {
    id: "cpp-vector-iter",
    title: "Iterator Invalidation on Push_Back (C++)",
    language: "cpp",
    tag: "Data Structures",
    prompt:
      "Task: Duplicate array elements in a C++ std::vector. Notice how push_back reallocates storage and invalidates existing iterators.",
    defaultStdin: "42",
    initialCode: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> vec = {1, 2, 3};
    
    // Cognitive Trap: Iterating with an iterator while pushing elements!
    // push_back may trigger reallocation, leaving the iterator dangling!
    for (auto it = vec.begin(); it != vec.end(); ++it) {
        if (*it == 2) {
            vec.push_back(99); // Undefined behavior: iterator invalidation!
            break;
        }
    }

    std::cout << "Vector size: " << vec.size() << std::endl;
    for (int n : vec) std::cout << n << " ";
    std::cout << std::endl;
    return 0;
}`,
    expectedOutcome: "Prevent iterator invalidation via index iteration or reserve()",
  },
  {
    id: "event-loop-js",
    title: "Async Microtask vs Macrotask Order (JS)",
    language: "javascript",
    tag: "Concurrency",
    prompt:
      "Task: Predict and control execution sequence between Promises (Microtask queue) and setTimeout (Macrotask queue).",
    defaultStdin: "",
    initialCode: `console.log("1: Synchronous Start");

setTimeout(() => {
    console.log("2: Macrotask Timeout");
}, 0);

Promise.resolve().then(() => {
    console.log("3: Microtask Promise");
});

console.log("4: Synchronous End");`,
    expectedOutcome: "Correct sequence: 1 -> 4 -> 3 -> 2",
  },
  {
    id: "java-string-equality",
    title: "String Identity vs Value Equality (Java)",
    language: "java",
    tag: "Language Semantics",
    prompt:
      "Task: Compare user input string with a target password. Notice difference between == (reference identity) and .equals() (value).",
    defaultStdin: "secret",
    initialCode: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String expected = "secret";
        String input = scanner.hasNext() ? scanner.next() : "secret";

        // Cognitive Trap: Using == checks memory address identity, not string content!
        if (input == expected) {
            System.out.println("Access Granted!");
        } else {
            System.out.println("Access Denied! Identity mismatch even if characters match.");
        }
    }
}`,
    expectedOutcome: "Use input.equals(expected) for character value comparison",
  },
];

export default function TerminalPage() {
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge>(CHALLENGES[0]);
  const [code, setCode] = useState<string>(CHALLENGES[0].initialCode);
  const [language, setLanguage] = useState<SupportedLanguage>(CHALLENGES[0].language);
  const [stdinInput, setStdinInput] = useState<string>(CHALLENGES[0].defaultStdin);
  const [showStdin, setShowStdin] = useState(true);

  // Execution state
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileResult, setCompileResult] = useState<CompileResponse | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Diagnosis state
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<CodeDiagnosisResponse | null>(null);
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  // Switch challenge
  const handleSelectChallenge = (c: Challenge) => {
    setSelectedChallenge(c);
    setCode(c.initialCode);
    setLanguage(c.language);
    setStdinInput(c.defaultStdin);
    setCompileResult(null);
    setExecutionError(null);
    setDiagnosis(null);
    setDiagnosisError(null);
    setAppliedNotification(null);
  };

  // Run real native compilation & execution
  const handleRunCode = async () => {
    setIsCompiling(true);
    setExecutionError(null);

    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          code,
          stdin: stdinInput,
          timeoutMs: 8000,
        }),
      });

      const data = (await res.json()) as CompileResponse;
      if (!res.ok) {
        throw new Error(data.error || `Compiler server error (${res.status})`);
      }

      setCompileResult(data);
    } catch (err: unknown) {
      setExecutionError((err as Error)?.message || "Failed to execute code.");
    } finally {
      setIsCompiling(false);
    }
  };

  // Call AI Code Doctor
  const handleDiagnose = async () => {
    setIsDiagnosing(true);
    setDiagnosisError(null);
    setAppliedNotification(null);

    try {
      const res = await fetch("/api/diagnose-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          problemTitle: selectedChallenge.title,
          expectedOutcome: selectedChallenge.expectedOutcome,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Diagnosis failed (${res.status})`);
      }

      const diag = (await res.json()) as CodeDiagnosisResponse;
      setDiagnosis(diag);
    } catch (err: unknown) {
      setDiagnosisError((err as Error)?.message || "Failed to analyze code. Please check your connection.");
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Surgical Line Replacement: Replaces ONLY the targeted lines, preserving everything else
  const handleApplyLineFix = () => {
    if (!diagnosis || !diagnosis.replacementSnippet) return;

    const startLine = diagnosis.targetStartLine ?? diagnosis.errorLine;
    const endLine = diagnosis.targetEndLine ?? startLine;

    if (!startLine) {
      // Fallback to full code if no line numbers
      setCode(diagnosis.fullPatchedCode || diagnosis.replacementSnippet);
      setAppliedNotification("Updated full code");
      setTimeout(() => setAppliedNotification(null), 3000);
      return;
    }

    const linesArray = code.split("\n");
    const startIndex = Math.max(0, startLine - 1);
    const deleteCount = Math.max(1, (endLine ?? startLine) - startLine + 1);

    // Replace only lines in range [startLine..endLine]
    linesArray.splice(startIndex, deleteCount, diagnosis.replacementSnippet);
    const newCode = linesArray.join("\n");

    setCode(newCode);
    setAppliedNotification(`Surgically modified lines ${startLine}-${endLine ?? startLine}!`);
    setTimeout(() => setAppliedNotification(null), 3500);
  };

  // Full Patched File replacement
  const handleApplyFullPatch = () => {
    if (!diagnosis?.fullPatchedCode) return;
    setCode(diagnosis.fullPatchedCode);
    setAppliedNotification("Applied complete patched code to editor!");
    setTimeout(() => setAppliedNotification(null), 3500);
  };

  const lines = code.split("\n");
  const errorLine = diagnosis?.hasMistake ? diagnosis.errorLine : null;
  const startLine = diagnosis?.targetStartLine ?? errorLine;
  const endLine = diagnosis?.targetEndLine ?? startLine;

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] flex flex-col overflow-x-hidden no-scrollbar w-full transition-colors duration-200">
      <Navbar activeRoute="/terminal" />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex-1 w-full flex flex-col gap-4 overflow-x-hidden no-scrollbar">
        {/* Challenge Selection Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--surface-1)] border border-[var(--mist)] shadow-xs">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-secondary)] font-bold shrink-0 mr-1">
              Challenge:
            </span>
            {CHALLENGES.map((c) => {
              const isSelected = selectedChallenge.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectChallenge(c)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer select-none shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-[var(--ink-bright)] text-white font-bold shadow-xs border border-[var(--ink-border)]"
                      : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--mist)]"
                  }`}
                >
                  <span>{c.title}</span>
                </button>
              );
            })}
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-[var(--text-secondary)] hidden sm:inline">Language:</span>
            <select
              id="terminal-language-select"
              name="terminal_language"
              aria-label="Programming Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              className="px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--mist)] text-[var(--text-primary)] font-semibold text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink-bright)] cursor-pointer"
            >
              <option value="c">C (GCC -O2)</option>
              <option value="cpp">C++ (G++ -std=c++17)</option>
              <option value="python">Python 3.13</option>
              <option value="javascript">JavaScript (Node.js)</option>
              <option value="java">Java (JDK 19)</option>
            </select>
          </div>
        </div>

        {/* Objective Banner */}
        <div className="px-4 py-2.5 rounded-xl bg-[var(--ink-subtle)] border border-[var(--ink-border)]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs font-sans text-[var(--text-primary)]">
            <strong className="font-mono text-[var(--ink-bright)] uppercase tracking-wide mr-2">Objective:</strong>
            {selectedChallenge.prompt}
          </div>
          <span className="text-[11px] font-mono text-[var(--ink-bright)] shrink-0 font-semibold">
            Target: {selectedChallenge.expectedOutcome}
          </span>
        </div>

        {/* IDE Layout: Editor (Left) + Terminal Console & Doctor (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 items-stretch">
          {/* Left Column (7 cols): Code Editor */}
          <section className="lg:col-span-7 flex flex-col rounded-2xl border border-[var(--mist)] bg-[var(--surface-1)] shadow-sm overflow-hidden min-h-[380px] sm:min-h-[520px]">
            {/* Editor Toolbar */}
            <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-[var(--surface-2)] border-b border-[var(--mist)] flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--fracture-bright)]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--cracked-bright)]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--stable-bright)]" />
                <span className="font-mono text-xs text-[var(--text-secondary)] ml-1 sm:ml-2">
                  main.{language === "javascript" ? "js" : language === "python" ? "py" : language === "cpp" ? "cpp" : language === "java" ? "java" : "c"}
                </span>

                {appliedNotification && (
                  <span className="text-[10px] sm:text-[11px] font-mono text-[var(--stable-bright)] font-bold animate-pulse ml-1 sm:ml-2 truncate max-w-[120px] sm:max-w-none">
                    ✓ {appliedNotification}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRunCode}
                  isLoading={isCompiling}
                  className="shadow-xs font-mono text-xs px-2.5 sm:px-3.5 cursor-pointer"
                >
                  ▶ <span className="hidden xs:inline">Compile &amp; </span>Run
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDiagnose}
                  isLoading={isDiagnosing}
                  className="shadow-xs font-mono text-xs px-2.5 sm:px-3.5 bg-[var(--fracture-bright)] text-white hover:bg-[var(--fracture)] cursor-pointer"
                >
                  ⚡ Diagnose<span className="hidden sm:inline"> with AI Doctor</span>
                </Button>
              </div>
            </div>

            {/* Code Textarea & Gutter */}
            <div className="flex-1 flex overflow-hidden relative font-mono text-xs sm:text-sm bg-[var(--surface-1)]">
              {/* Line Numbers Gutter */}
              <div
                className="w-12 py-3 bg-[var(--surface-2)]/60 text-right pr-3 select-none text-[var(--text-tertiary)] border-r border-[var(--mist)] shrink-0 overflow-hidden"
                aria-hidden="true"
              >
                {lines.map((_, i) => {
                  const lineNum = i + 1;
                  const isError =
                    startLine && endLine && lineNum >= startLine && lineNum <= endLine;
                  return (
                    <div
                      key={lineNum}
                      className={`leading-relaxed ${
                        isError
                          ? "text-[var(--fracture-bright)] font-bold bg-[var(--fracture-subtle)] -mr-3 pr-3 border-r-2 border-[var(--fracture-bright)]"
                          : ""
                      }`}
                    >
                      {lineNum}
                    </div>
                  );
                })}
              </div>

              {/* Code Input */}
              <div className="flex-1 relative overflow-auto no-scrollbar">
                <textarea
                  id="terminal-code-editor"
                  name="terminal_code"
                  aria-label="Source Code Editor"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  className="w-full h-full p-3 font-mono text-xs sm:text-sm leading-relaxed bg-transparent text-[var(--text-primary)] resize-none focus-visible:outline-none"
                  style={{ whiteSpace: "pre", minHeight: "480px" }}
                />
              </div>
            </div>
          </section>

          {/* Right Column (5 cols): Native Execution Console & AI Doctor */}
          <section className="lg:col-span-5 flex flex-col gap-4">
            {/* Execution Console Output Window */}
            <div className="flex-1 min-h-[250px] rounded-2xl border border-[var(--mist)] bg-[var(--surface-1)] shadow-sm flex flex-col overflow-hidden">
              <div className="px-4 py-2 bg-[var(--surface-2)] border-b border-[var(--mist)] flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 font-mono text-xs text-[var(--text-secondary)] font-bold">
                  <span className="text-[var(--stable-bright)]">❯_</span>
                  <span>Execution Output Console</span>
                </div>

                {/* Performance Metrics: Compile Time + Run Time + Exit Code */}
                {compileResult && (
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    {compileResult.metrics.compileTimeMs !== null && (
                      <span className="px-1.5 py-0.5 rounded bg-[var(--surface-1)] text-[var(--text-secondary)] border border-[var(--mist)]">
                        ⏱️ Compile: {compileResult.metrics.compileTimeMs}ms
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 rounded bg-[var(--surface-1)] text-[var(--text-secondary)] border border-[var(--mist)]">
                      ⚡ Run: {compileResult.metrics.executionTimeMs}ms
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        compileResult.metrics.exitCode === 0
                          ? "bg-[var(--stable-subtle)] text-[var(--stable-bright)]"
                          : "bg-[var(--fracture-subtle)] text-[var(--fracture-bright)]"
                      }`}
                    >
                      Exit: {compileResult.metrics.exitCode}
                    </span>
                    {compileResult.metrics.isCached && (
                      <span className="text-[var(--ink-bright)] font-bold">⚡ Cached</span>
                    )}
                  </div>
                )}
              </div>

              {/* Console Body */}
              <div className="flex-1 p-3.5 font-mono text-xs text-[var(--text-primary)] bg-[var(--surface-0)] overflow-y-auto no-scrollbar space-y-1">
                {isCompiling ? (
                  <div className="py-8 text-center space-y-2">
                    <div className="w-6 h-6 rounded-full border-2 border-[var(--ink-bright)] border-t-transparent animate-spin mx-auto" />
                    <p className="font-mono text-xs text-[var(--text-secondary)]">
                      Compiling via native {language.toUpperCase()} toolchain...
                    </p>
                  </div>
                ) : executionError ? (
                  <div className="text-[var(--fracture-bright)] leading-relaxed">
                    ❌ Execution Error: {executionError}
                  </div>
                ) : !compileResult ? (
                  <div className="text-[var(--text-tertiary)] italic py-2">
                    Click &quot;▶ Compile &amp; Run&quot; to execute this code in the real compiler toolchain...
                  </div>
                ) : (
                  <div>
                    {compileResult.stderr && (
                      <pre className="text-[var(--fracture-bright)] whitespace-pre-wrap leading-relaxed mb-2 font-mono text-xs">
                        {compileResult.stderr}
                      </pre>
                    )}
                    {compileResult.stdout ? (
                      <pre className="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed font-mono text-xs">
                        {compileResult.stdout}
                      </pre>
                    ) : (
                      !compileResult.stderr && (
                        <div className="text-[var(--text-tertiary)] italic">
                          (Program completed cleanly with no standard output)
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Interactive Stdin Input Drawer */}
              <div className="p-2.5 bg-[var(--surface-2)] border-t border-[var(--mist)] flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>⌨️ Standard Input (stdin):</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowStdin(!showStdin)}
                    className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    {showStdin ? "Collapse ▲" : "Expand ▼"}
                  </button>
                </div>

                {showStdin && (
                  <div className="flex items-center gap-2">
                    <input
                      id="terminal-stdin-input"
                      name="terminal_stdin"
                      aria-label="Standard input stream (stdin)"
                      autoComplete="off"
                      type="text"
                      value={stdinInput}
                      onChange={(e) => setStdinInput(e.target.value)}
                      placeholder="Type input characters / numbers to pipe into program stdin..."
                      className="w-full px-2.5 py-1 rounded-lg bg-[var(--surface-1)] border border-[var(--mist)] font-mono text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink-bright)]"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRunCode}
                      className="shrink-0 text-xs px-2.5 py-1 h-auto font-mono"
                    >
                      Send &amp; Re-run
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* AI Code Doctor Surgical Diagnosis Panel */}
            <div className="flex-1 min-h-[280px] rounded-2xl border border-[var(--mist)] bg-[var(--surface-1)] shadow-sm flex flex-col overflow-hidden">
              <div className="px-4 py-2 bg-[var(--surface-2)] border-b border-[var(--mist)] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 font-mono text-xs text-[var(--text-secondary)] font-bold">
                  <span className="text-[var(--fracture-bright)]">⚡</span>
                  <span>Faultline AI Code Doctor</span>
                </div>
                {diagnosis?.hasMistake && startLine && (
                  <span className="px-2 py-0.5 rounded bg-[var(--fracture-subtle)] text-[var(--fracture-bright)] border border-[var(--fracture-border)] text-[10px] font-mono font-bold">
                    Target: Line {startLine}{endLine && endLine !== startLine ? `-${endLine}` : ""}
                  </span>
                )}
              </div>

              <div className="flex-1 p-4 overflow-y-auto no-scrollbar text-xs">
                {isDiagnosing ? (
                  <div className="py-8 text-center space-y-2">
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--fracture-bright)] border-t-transparent animate-spin mx-auto" />
                    <p className="font-mono text-[var(--text-secondary)] text-xs">
                      Locating exact cognitive faultline &amp; generating surgical line repair...
                    </p>
                  </div>
                ) : diagnosisError ? (
                  <div className="p-3 rounded-lg bg-[var(--fracture-subtle)] border border-[var(--fracture-border)] text-[var(--fracture-fg)] font-medium">
                    {diagnosisError}
                  </div>
                ) : !diagnosis ? (
                  <div className="py-8 text-center text-[var(--text-tertiary)] italic">
                    Click &quot;⚡ Diagnose with AI Doctor&quot; to pinpoint the exact line of mistake and generate a surgical modification.
                  </div>
                ) : (
                  <div className="space-y-3 animate-fade-in font-sans">
                    {/* Misconception Title */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-[var(--fracture-bright)] uppercase tracking-wider text-[11px]">
                        Diagnosed Cognitive Faultline:
                      </span>
                      <Badge variant={diagnosis.hasMistake ? "fracture" : "stable"} size="sm">
                        {diagnosis.misconceptionTitle}
                      </Badge>
                    </div>

                    {/* Explanation */}
                    <p className="text-[var(--text-primary)] leading-relaxed font-medium bg-[var(--surface-2)] p-2.5 rounded-lg border border-[var(--mist)]">
                      {diagnosis.explanation}
                    </p>

                    {/* Line-by-Line Modification Diff */}
                    {diagnosis.hasMistake && (
                      <div className="space-y-1.5 font-mono text-[11px] p-3 rounded-xl bg-[var(--surface-0)] border border-[var(--mist)]">
                        <div className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1 flex items-center justify-between">
                          <span>Surgical Modification Plan:</span>
                          <span className="text-[var(--fracture-bright)]">
                            Lines {startLine}{endLine && endLine !== startLine ? `..${endLine}` : ""}
                          </span>
                        </div>

                        {diagnosis.faultySnippet && (
                          <div className="p-1.5 rounded bg-[var(--fracture-subtle)] border border-[var(--fracture-border)]/40 text-[var(--fracture-fg)]">
                            <span className="font-bold mr-1 text-[var(--fracture-bright)]">- Old:</span>
                            <code>{diagnosis.faultySnippet}</code>
                          </div>
                        )}

                        <div className="p-1.5 rounded bg-[var(--stable-subtle)] border border-[var(--stable-border)]/40 text-[var(--stable-bright)]">
                          <span className="font-bold mr-1 text-[var(--stable-bright)]">+ Fix:</span>
                          <code>{diagnosis.replacementSnippet}</code>
                        </div>

                        {/* Surgical Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 mt-2 border-t border-[var(--mist)]/60">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleApplyLineFix}
                            className="text-xs font-mono font-bold py-1 h-auto"
                          >
                            ✨ Replace Line {startLine}{endLine && endLine !== startLine ? `-${endLine}` : ""} Only
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleApplyFullPatch}
                            className="text-xs font-mono py-1 h-auto"
                          >
                            ⚡ Apply Full Patched File
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Cognitive Anchor Tip */}
                    <div className="p-2.5 rounded-lg bg-[var(--ink-subtle)] border border-[var(--ink-border)]/50">
                      <span className="font-mono text-[10px] text-[var(--ink-bright)] uppercase tracking-wider font-bold block mb-0.5">
                        💡 Cognitive Anchor (Mental Model Rule)
                      </span>
                      <p className="text-[var(--text-primary)] text-xs font-medium">
                        {diagnosis.cognitiveAnchor}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
