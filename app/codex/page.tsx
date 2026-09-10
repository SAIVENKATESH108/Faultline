"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/Badge";

// ─────────────────────────────────────────────────────────────────────────────
// Misconception Codex Entries Data
// ─────────────────────────────────────────────────────────────────────────────

interface CodexEntry {
  id: string;
  category: "Memory & Pointers" | "Data Structures" | "Concurrency" | "Language Semantics";
  title: string;
  trap: string;
  mentalShift: string;
  badSnippet: string;
  goodSnippet: string;
  language: string;
}

const CODEX_ENTRIES: CodexEntry[] = [
  {
    id: "ptr-arithmetic",
    category: "Memory & Pointers",
    title: "Pointer Arithmetic Scaling Fallacy",
    trap: "Assuming pointer arithmetic adds raw bytes, so adding 2 to an int* moves forward 2 bytes instead of 2 * sizeof(int) bytes.",
    mentalShift: "C compilers automatically multiply pointer arithmetic additions by the size of the referenced type (sizeof(T)).",
    badSnippet: "int *p = arr;\n// Adding byte count manually overshoots by 4x!\nint *bad = p + (2 * sizeof(int));",
    goodSnippet: "int *p = arr;\n// Compiler auto-scales: moves forward exactly 2 integer elements\nint *good = p + 2;",
    language: "c",
  },
  {
    id: "shallow-slice",
    category: "Memory & Pointers",
    title: "Shallow Copy vs Deep Independence",
    trap: "Assuming that list slicing `arr[:]` or `Object.assign()` creates deep isolated duplicates of nested objects.",
    mentalShift: "Shallow copies create new outer containers, but the inner nested objects remain shared memory references.",
    badSnippet: "nested = [[1, 2], [3, 4]]\nshallow = nested[:]\nshallow[0].append(99) # Modifies nested[0] too!",
    goodSnippet: "import copy\nnested = [[1, 2], [3, 4]]\ndeep = copy.deepcopy(nested)\ndeep[0].append(99) # Safe!",
    language: "python",
  },
  {
    id: "event-loop-microtasks",
    category: "Concurrency",
    title: "Async Microtask vs Macrotask Queueing",
    trap: "Assuming setTimeout(fn, 0) executes immediately before resolved Promises because it has a 0ms delay.",
    mentalShift: "Microtasks (Promises, queueMicrotask) always drain completely before the event loop advances to the next Macrotask (setTimeout).",
    badSnippet: "setTimeout(() => console.log('Timeout'), 0);\nPromise.resolve().then(() => console.log('Promise'));\n// Trap: thinking Timeout runs first!",
    goodSnippet: "// Execution order:\n// 1. Synchronous stack\n// 2. Microtasks (Promises)\n// 3. Macrotasks (setTimeout)",
    language: "javascript",
  },
  {
    id: "bst-pointer-swap",
    category: "Data Structures",
    title: "Destructive Tree Subtree Assignment",
    trap: "Assigning `node.left = invert(node.right)` directly overwrites the left reference before it can be inverted and assigned to `node.right`.",
    mentalShift: "When swapping references in place, either store the original reference in a temporary variable or perform parallel destructuring.",
    badSnippet: "node.left = invert(node.right);\nnode.right = invert(node.left); // Lost original left!",
    goodSnippet: "const tempLeft = node.left;\nnode.left = invert(node.right);\nnode.right = invert(tempLeft);",
    language: "javascript",
  },
  {
    id: "closure-loop-var",
    category: "Language Semantics",
    title: "Closure Over Shared Loop Variable",
    trap: "Capturing a loop variable declared with `var` inside asynchronous callbacks captures the final mutated value rather than each iteration's value.",
    mentalShift: "Block-scoped `let` binds a distinct lexical environment for every iteration, preserving the exact iteration state in closures.",
    badSnippet: "for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 100); // Prints: 3, 3, 3\n}",
    goodSnippet: "for (let i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 100); // Prints: 0, 1, 2\n}",
    language: "javascript",
  },
  {
    id: "recursion-base-case",
    category: "Data Structures",
    title: "Missing Guard Before Recursive Leap",
    trap: "Writing recursive transitions without handling empty/null base cases, causing CallStack Overflow or NullPointer exceptions.",
    mentalShift: "Every recursive descent must begin with an exhaustive terminal guard condition returning a predictable baseline unit.",
    badSnippet: "function sum(node) {\n  return node.val + sum(node.left) + sum(node.right);\n}",
    goodSnippet: "function sum(node) {\n  if (!node) return 0; // Explicit terminal anchor\n  return node.val + sum(node.left) + sum(node.right);\n}",
    language: "javascript",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Misconception Codex Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CodexPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", "Memory & Pointers", "Data Structures", "Concurrency", "Language Semantics"];

  const filteredEntries = useMemo(() => {
    return CODEX_ENTRIES.filter((entry) => {
      const matchesCat = selectedCategory === "All" || entry.category === selectedCategory;
      const matchesSearch =
        !search.trim() ||
        entry.title.toLowerCase().includes(search.toLowerCase()) ||
        entry.trap.toLowerCase().includes(search.toLowerCase()) ||
        entry.mentalShift.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [search, selectedCategory]);

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] flex flex-col overflow-x-hidden no-scrollbar w-full transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar activeRoute="/codex" />

      {/* Main Content Area */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full flex flex-col gap-6 overflow-x-hidden no-scrollbar">
        {/* Page Hero Header */}
        <div className="p-6 sm:p-8 rounded-3xl border border-[var(--mist)] bg-[var(--surface-1)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--fracture-bright)]" />
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-secondary)] font-bold">
                Faultline Cognitive Encyclopedia
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-sans font-extrabold tracking-tight text-[var(--text-primary)]">
              Misconception Codex
            </h1>
            <p className="text-sm text-[var(--text-secondary)] max-w-2xl mt-1.5 leading-relaxed">
              A curated compendium of cognitive faultlines, common programming traps, and the precise mental shifts required to master them.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/terminal"
              className="px-4 py-2 rounded-xl bg-[var(--ink-bright)] hover:bg-[var(--ink)] text-white text-xs font-mono font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>💻 Open Live Terminal</span>
              <span>↗</span>
            </Link>
          </div>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--surface-1)] border border-[var(--mist)] shadow-xs">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer select-none shrink-0 ${
                  selectedCategory === cat
                    ? "bg-[var(--ink-bright)] text-white font-bold border border-[var(--ink-border)] shadow-xs"
                    : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--mist)] hover:border-[var(--ink-border)]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input with id and name attributes */}
          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs text-[var(--text-tertiary)]">
              🔍
            </span>
            <input
              id="codex-search-input"
              name="codex_search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search misconceptions..."
              aria-label="Search misconceptions in codex"
              autoComplete="off"
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--mist)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink-bright)]"
            />
          </div>
        </div>

        {/* Codex Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
          {filteredEntries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl border border-[var(--mist)] bg-[var(--surface-1)] p-5 flex flex-col justify-between shadow-sm hover:border-[var(--ink-border)] transition-all duration-200"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[var(--mist)]">
                  <Badge variant="neutral" size="sm">
                    {entry.category}
                  </Badge>
                  <span className="font-mono text-[11px] text-[var(--text-tertiary)] uppercase font-semibold">
                    {entry.language}
                  </span>
                </div>

                <h3 className="text-base font-sans font-bold text-[var(--text-primary)] mb-3">
                  {entry.title}
                </h3>

                {/* The Trap */}
                <div className="p-3 rounded-xl bg-[var(--fracture-subtle)] border border-[var(--fracture-border)]/50 mb-3">
                  <div className="font-mono text-[10px] text-[var(--fracture-bright)] uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
                    <span>🔴</span> The Cognitive Trap
                  </div>
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed font-medium">
                    {entry.trap}
                  </p>
                </div>

                {/* The Shift */}
                <div className="p-3 rounded-xl bg-[var(--stable-subtle)] border border-[var(--stable-border)]/50 mb-4">
                  <div className="font-mono text-[10px] text-[var(--stable-bright)] uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
                    <span>🟢</span> The Mental Shift
                  </div>
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed font-medium">
                    {entry.mentalShift}
                  </p>
                </div>

                {/* Comparative Code Snippets */}
                <div className="space-y-2 mb-2 font-mono text-[11px]">
                  <div>
                    <span className="text-[10px] text-[var(--fracture-bright)] block mb-0.5 font-bold">
                      ✕ Flawed Code:
                    </span>
                    <pre className="p-2 rounded-lg bg-[var(--surface-0)] border border-[var(--mist)] text-[var(--fracture-fg)] overflow-x-auto no-scrollbar">
                      <code>{entry.badSnippet}</code>
                    </pre>
                  </div>

                  <div>
                    <span className="text-[10px] text-[var(--stable-bright)] block mb-0.5 font-bold">
                      ✓ Sound Pattern:
                    </span>
                    <pre className="p-2 rounded-lg bg-[var(--surface-0)] border border-[var(--mist)] text-[var(--stable-bright)] overflow-x-auto no-scrollbar">
                      <code>{entry.goodSnippet}</code>
                    </pre>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-3 mt-4 border-t border-[var(--mist)] flex justify-end">
                <Link
                  href="/terminal"
                  className="text-xs font-mono text-[var(--ink-bright)] hover:underline font-semibold flex items-center gap-1"
                >
                  <span>Experiment in Live Terminal</span>
                  <span>→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
