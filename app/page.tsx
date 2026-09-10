"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import HeroScene from "@/components/HeroScene";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// Showcase items catalog mapping the organized screenshots
interface ShowcaseItem {
  id: string;
  title: string;
  caption: string;
  category: "strata" | "compiler" | "doctor" | "codex" | "themes";
  imagePath: string;
  tags: string[];
  ctaLink: string;
  ctaText: string;
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  // Strata Explorer
  {
    id: "strata-bst",
    title: "Geological Concept Strata & Diagnostic Probes",
    caption:
      "Concepts mapped from Bedrock foundations (Depth 0) to Apex synthesis (Depth 3). Nodes transition dynamically through Available, Cracked, and Stable states as you resolve cognitive probes.",
    category: "strata",
    imagePath: "/showcase/strata-bst-dark.png",
    tags: ["Gemini 3.5 Lite", "Geological Graph", "Adaptive Dependencies"],
    ctaLink: "/strata?topic=Binary+Search+Trees",
    ctaText: "Explore BST Strata",
  },
  {
    id: "strata-probe",
    title: "Adaptive Diagnostic Question Engine",
    caption:
      "Targeted multi-choice probes specifically engineered with distractor choices matching prevalent mental models and common cognitive fallacies.",
    category: "strata",
    imagePath: "/showcase/diagnostic-probe-question.png",
    tags: ["Cognitive Distractors", "Real-Time Evaluation"],
    ctaLink: "/strata",
    ctaText: "Try Diagnostic Probes",
  },
  {
    id: "strata-stabilized",
    title: "Mastery Confirmed: Concept Stabilized",
    caption:
      "Correctly solving probes stabilizes the concept node with luminous emerald indicators, unlocking downstream child nodes along the geological dependency strata.",
    category: "strata",
    imagePath: "/showcase/concept-stabilized-dark.png",
    tags: ["Mastery Unlocked", "Knowledge Retention"],
    ctaLink: "/strata",
    ctaText: "View Mastery Flow",
  },
  {
    id: "strata-misconception",
    title: "Misconception Diagnosis & Counter-Puzzles",
    caption:
      "Selecting a distractor triggers immediate cognitive diagnosis, detailing the exact flawed assumption along with counter-puzzles and mental model anchors.",
    category: "strata",
    imagePath: "/showcase/misconception-diagnosed-dark.png",
    tags: ["Cognitive Anchor", "Counter-Puzzle"],
    ctaLink: "/strata",
    ctaText: "Inspect Diagnosis",
  },

  // Native Compiler & Stdin
  {
    id: "compiler-stdin",
    title: "Native Execution Console & Interactive Stdin",
    caption:
      "Genuine compilation via local GCC, G++, Python 3.13, Node.js, and Java toolchains. Includes an interactive drawer to pipe standard input (stdin) directly into running programs.",
    category: "compiler",
    imagePath: "/showcase/terminal-stdin-dark.png",
    tags: ["Native GCC/Python", "Interactive Stdin", "Zero Mock Data"],
    ctaLink: "/terminal",
    ctaText: "Open Compiler Terminal",
  },
  {
    id: "compiler-success",
    title: "Sub-Millisecond Execution & Performance Metrics",
    caption:
      "Displays real compilation time in milliseconds, execution run time, exit codes, and an instant ⚡ Cached badge powered by an O(1) Doubly-Linked List + Hash Map LRU Cache.",
    category: "compiler",
    imagePath: "/showcase/terminal-success-dark.png",
    tags: ["LRU Cache O(1)", "Compile Time: 300ms", "Sub-ms Re-runs"],
    ctaLink: "/terminal",
    ctaText: "Run Benchmark",
  },

  // Surgical AI Doctor
  {
    id: "doctor-diff",
    title: "Surgical AI Code Doctor: Targeted Line Diff",
    caption:
      "Unlike ordinary LLM assistants that wipe and rewrite your entire codebase, Faultline pinpoints the exact line numbers (e.g. Lines 3-4) and displays a surgical Old vs. Fix diff.",
    category: "doctor",
    imagePath: "/showcase/doctor-surgical-diff-dark.png",
    tags: ["Line-Targeted", "Visual Diff", "Non-Destructive"],
    ctaLink: "/terminal",
    ctaText: "Test AI Code Doctor",
  },
  {
    id: "doctor-applied",
    title: "In-Memory Surgical Line Splicing",
    caption:
      "Clicking 'Replace Line Only' executes an in-memory splice on only the affected lines, preserving your imports, custom variables, and existing functions with 100% integrity.",
    category: "doctor",
    imagePath: "/showcase/doctor-applied-dark.png",
    tags: ["Precision Patch", "Editor Preservation"],
    ctaLink: "/terminal",
    ctaText: "Experience Surgical Fix",
  },

  // Misconception Codex
  {
    id: "codex-overview",
    title: "Misconception Codex Catalog",
    caption:
      "A curated encyclopedia of notorious programming misconceptions across memory architecture, pointer arithmetic, asynchronous event loops, and type semantics.",
    category: "codex",
    imagePath: "/showcase/codex-overview-dark.png",
    tags: ["Knowledge Base", "Mental Models", "Interactive Search"],
    ctaLink: "/codex",
    ctaText: "Browse All Misconceptions",
  },
  {
    id: "codex-cards",
    title: "Cognitive Traps vs. Sound Mental Shifts",
    caption:
      "Each entry contrasts the psychological trap with the correct mental shift, showing side-by-side flawed code versus sound engineering patterns with direct links to live terminal testing.",
    category: "codex",
    imagePath: "/showcase/codex-cards-dark.png",
    tags: ["Side-by-Side Diff", "Trap vs Shift", "Live Experiment"],
    ctaLink: "/codex",
    ctaText: "Open Codex Cards",
  },

  // Day & Night Themes
  {
    id: "theme-terminal-day",
    title: "Crisp High-Contrast Day Theme (Terminal)",
    caption:
      "Thoughtfully tailored daytime color palette engineered for bright environments with crisp borders, rich syntax highlighting, and physical depth.",
    category: "themes",
    imagePath: "/showcase/terminal-day-mode.png",
    tags: ["Crisp White Surfaces", "High Contrast", "Dual HSL Palette"],
    ctaLink: "/terminal",
    ctaText: "View Day Terminal",
  },
  {
    id: "theme-strata-day",
    title: "Day Theme: Geological Strata",
    caption:
      "Full aesthetic parity in light mode: clear bedrock boundaries, readable diagnostic questions, and vibrant status chips.",
    category: "themes",
    imagePath: "/showcase/strata-day-mode.png",
    tags: ["Light Mode", "Geological Clarity"],
    ctaLink: "/strata",
    ctaText: "View Day Strata",
  },
  {
    id: "theme-codex-day",
    title: "Day Theme: Misconception Codex",
    caption:
      "Crisp reading experience for long-form cognitive analysis, mental shift comparisons, and code syntax cards.",
    category: "themes",
    imagePath: "/showcase/codex-day-mode.png",
    tags: ["Editorial Typography", "Reading Mode"],
    ctaLink: "/codex",
    ctaText: "View Day Codex",
  },
];

const SHOWCASE_TABS = [
  { key: "strata", label: "Cognitive Strata", icon: "🌋", count: 4 },
  { key: "compiler", label: "Native Compiler & Stdin", icon: "💻", count: 2 },
  { key: "doctor", label: "Surgical AI Doctor", icon: "🩺", count: 2 },
  { key: "codex", label: "Misconception Codex", icon: "📖", count: 2 },
  { key: "themes", label: "Day & Night Harmony", icon: "🌓", count: 3 },
] as const;

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<ShowcaseItem["category"]>("strata");
  const [selectedImage, setSelectedImage] = useState<ShowcaseItem>(SHOWCASE_ITEMS[0]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Filter items for currently selected tab
  const tabItems = SHOWCASE_ITEMS.filter((item) => item.category === activeTab);

  // When switching tabs, automatically set the first item as active
  const handleTabChange = (category: ShowcaseItem["category"]) => {
    setActiveTab(category);
    const firstInTab = SHOWCASE_ITEMS.find((item) => item.category === category);
    if (firstInTab) {
      setSelectedImage(firstInTab);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] selection:bg-[var(--ink-bright)] selection:text-white flex flex-col overflow-x-hidden no-scrollbar w-full transition-colors duration-200">
      {/* ── Global Top Navbar ──────────────────────────────────────────────── */}
      <Navbar activeRoute="/" />

      {/* ── Hero Section ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 px-4 sm:px-6 lg:px-8 border-b border-[var(--mist)]">
        {/* Ambient background glow auras */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(59,130,246,0.14)_0%,rgba(167,139,250,0.06)_40%,transparent_70%)] pointer-events-none -z-10 animate-pulse-glow" />
        <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-[radial-gradient(circle,rgba(239,68,68,0.08)_0%,transparent_65%)] pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-[radial-gradient(circle,rgba(16,185,129,0.08)_0%,transparent_65%)] pointer-events-none -z-10" />

        <div className="max-w-[1400px] mx-auto flex flex-col items-center text-center">
          {/* Badge Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--mist)] text-xs font-mono mb-6 shadow-xs animate-float">
            <span className="w-2 h-2 rounded-full bg-[var(--fracture-bright)] animate-ping" />
            <span className="text-[var(--text-secondary)]">
              Adaptive Cognitive Compiler • Powered by
            </span>
            <span className="text-[var(--ink-bright)] font-bold">Gemini 3.5 Lite</span>
            <span className="text-[var(--mist-100)]">•</span>
            <span className="text-[var(--stable-bright)] font-semibold">Native Toolchains</span>
          </div>

          {/* 3D Geological Crystal Emblem */}
          <div className="relative mb-6 cursor-pointer group">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,var(--ink-bright)_0%,transparent_70%)] opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-300" />
            <HeroScene size={120} className="w-[120px] h-[120px] transition-transform duration-300 group-hover:scale-110" />
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tight max-w-4xl leading-[1.15] mb-5">
            Stop Fixing Syntax Errors. <br />
            <span className="gradient-text-brand">Debug Your Mental Model.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-[var(--text-secondary)] max-w-3xl leading-relaxed mb-8 font-sans">
            Faultline treats conceptual misunderstandings like compiler faults. Traverse geological
            concept strata, compile natively across 5 languages with interactive standard input, and
            let the <strong className="text-[var(--text-primary)]">AI Code Doctor</strong> surgically modify
            only the flawed lines in your code.
          </p>

          {/* CTA Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 w-full max-w-md sm:max-w-none">
            <Link href="/strata" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto shadow-md font-mono text-sm px-6 py-3.5 h-auto bg-[var(--ink-bright)] hover:bg-[var(--ink-border)] text-white flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>🌋 Launch Strata Explorer</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Button>
            </Link>

            <Link href="/terminal" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto shadow-xs font-mono text-sm px-6 py-3.5 h-auto bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--mist)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>💻 Live Terminal &amp; AI Doctor</span>
              </Button>
            </Link>

            <Link href="/codex" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto font-mono text-sm px-5 py-3.5 h-auto bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-primary)] hover:text-[var(--ink-bright)] border border-[var(--mist)] hover:border-[var(--ink-border)] flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
              >
                <span>📖 Misconception Codex</span>
              </Button>
            </Link>

            <a
              href="/Faultline_System_Documentation.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto font-mono text-sm px-5 py-3.5 h-auto bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-primary)] hover:text-[var(--ink-bright)] border border-[var(--mist)] hover:border-[var(--ink-border)] flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
              >
                <span>📄 System Docs (PDF)</span>
              </Button>
            </a>
          </div>

          {/* Quick Launch Topic Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-mono">
            <span className="text-[var(--text-tertiary)] mr-1">✨ Instant Demo Strata:</span>
            {[
              { label: "Binary Search Trees", tag: "Algorithms" },
              { label: "Pointer Arithmetic in C", tag: "C/GCC" },
              { label: "Memory Management in Python", tag: "Python 3" },
              { label: "JavaScript Event Loop", tag: "Node.js" },
              { label: "Transformer Self-Attention", tag: "AI/ML" },
            ].map((topic) => (
              <Link
                key={topic.label}
                href={`/strata?topic=${encodeURIComponent(topic.label)}`}
                className="px-3 py-1 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--mist)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-1.5 hover:border-[var(--ink-bright)] shadow-2xs group"
              >
                <span className="group-hover:text-[var(--ink-bright)] transition-colors">{topic.label}</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-[var(--surface-1)] text-[var(--text-tertiary)] border border-[var(--mist)]">
                  {topic.tag}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive Showcase Gallery ───────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-[var(--surface-1)]/40 border-b border-[var(--mist)]">
        <div className="max-w-[1500px] mx-auto">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-bright)] uppercase tracking-wider font-bold mb-2">
                <span>📸 Interactive Feature Showcase</span>
                <span className="text-[var(--mist-100)]">•</span>
                <span className="text-[var(--text-tertiary)]">13 Verified System Views</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-sans font-extrabold tracking-tight text-[var(--text-primary)]">
                Engineered for Visual Clarity &amp; Deep Learning
              </h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)] max-w-md font-sans">
              Click through the tabs below to explore real screenshots of our cognitive strata, native compiler toolchain, surgical AI Doctor, and comprehensive codex.
            </p>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-8 border-b border-[var(--mist)]">
            {SHOWCASE_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`px-4 py-2.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-[var(--surface-2)] text-[var(--ink-bright)] border border-[var(--ink-border)]/50 shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]/60 border border-transparent"
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-[var(--ink-subtle)] text-[var(--ink-bright)]"
                        : "bg-[var(--surface-3)] text-[var(--text-tertiary)]"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Showcase Display: Large Featured View + Thumbnail Switcher */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left/Main Column (8 cols): Large Screenshot Preview */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div
                onClick={() => setLightboxImage(selectedImage.imagePath)}
                className="group relative rounded-2xl overflow-hidden border border-[var(--mist)] bg-[var(--surface-0)] shadow-lg cursor-zoom-in transition-transform duration-300 hover:border-[var(--ink-bright)]/60"
              >
                {/* Image Container */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/60">
                  <Image
                    src={selectedImage.imagePath}
                    alt={selectedImage.title}
                    fill
                    sizes="(max-width: 1200px) 100vw, 800px"
                    className="object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                    priority
                  />

                  {/* Zoom Overlay Pill */}
                  <div className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/20 text-white font-mono text-[11px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 pointer-events-none">
                    <span>🔍 Click to View Fullscreen</span>
                  </div>

                  {/* Category Chip */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-md bg-black/80 backdrop-blur-md border border-white/20 font-mono text-xs text-[var(--ink-bright)] font-bold">
                      {selectedImage.title}
                    </span>
                  </div>
                </div>
              </div>

              {/* Caption & Metadata bar */}
              <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--mist)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed max-w-2xl">
                  {selectedImage.caption}
                </p>
                <Link href={selectedImage.ctaLink} className="shrink-0">
                  <Button variant="primary" size="sm" className="font-mono text-xs cursor-pointer">
                    {selectedImage.ctaText} →
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Column (4 cols): Thumbnails List for current category */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              <span className="text-xs font-mono text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">
                Available Views ({tabItems.length}):
              </span>

              {tabItems.map((item) => {
                const isSelected = selectedImage.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedImage(item)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-[var(--surface-2)] border-[var(--ink-bright)] shadow-xs ring-1 ring-[var(--ink-bright)]/40"
                        : "bg-[var(--surface-1)] border-[var(--mist)] hover:bg-[var(--surface-2)]/60 hover:border-[var(--mist-100)]"
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0 border border-[var(--mist)] bg-black/40">
                      <Image
                        src={item.imagePath}
                        alt={item.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-xs font-sans font-bold truncate mb-1 ${
                          isSelected ? "text-[var(--ink-bright)]" : "text-[var(--text-primary)]"
                        }`}
                      >
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-[var(--text-tertiary)] line-clamp-2 leading-relaxed">
                        {item.caption}
                      </p>

                      {/* Tag badges */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-secondary)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Core Architectural Pillars (Bento Grid) ─────────────────────────── */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 border-b border-[var(--mist)]">
        <div className="max-w-[1400px] mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-14">
            <Badge variant="ink" size="md" className="mb-3">
              ⚡ 4 Pillars of Cognitive Mastery
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-sans font-black tracking-tight text-[var(--text-primary)] mb-4">
              Engineered From First Principles
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Standard coding platforms merely check string outputs against unit tests. Faultline
              is designed to trace the cognitive origins of why software fails.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1: Cognitive Strata */}
            <div className="p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--mist)] hover:border-[var(--ink-border)] transition-all duration-300 flex flex-col justify-between shadow-xs group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[var(--ink-subtle)] border border-[var(--ink-border)]/50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  🌋
                </div>
                <div className="text-xs font-mono text-[var(--ink-bright)] uppercase tracking-wider font-bold mb-1">
                  Pillar 01
                </div>
                <h3 className="text-lg font-sans font-bold text-[var(--text-primary)] mb-2.5">
                  Geological Cognitive Strata
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                  Concepts form a geological dependency DAG. Foundational bedrock concepts support
                  intermediate layers and apex synthesis. If a student struggles at depth 2, Faultline
                  probes bedrock depth 0.
                </p>
              </div>
              <div className="pt-4 border-t border-[var(--mist)] flex items-center justify-between text-xs font-mono text-[var(--ink-bright)] font-semibold">
                <span>Gemini 3.5 DAG</span>
                <span>Depth 0 → 3 ➔</span>
              </div>
            </div>

            {/* Pillar 2: Native Compiler Toolchain */}
            <div className="p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--mist)] hover:border-[var(--stable-border)] transition-all duration-300 flex flex-col justify-between shadow-xs group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[var(--stable-subtle)] border border-[var(--stable-border)]/50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  💻
                </div>
                <div className="text-xs font-mono text-[var(--stable-bright)] uppercase tracking-wider font-bold mb-1">
                  Pillar 02
                </div>
                <h3 className="text-lg font-sans font-bold text-[var(--text-primary)] mb-2.5">
                  Native Multi-Compiler Engine
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                  Zero mock responses. Code compiles against native system GCC, G++, Python 3.13,
                  Node.js, and Java toolchains. Captures actual stdout, stderr, compile timing, and execution exit codes.
                </p>
              </div>
              <div className="pt-4 border-t border-[var(--mist)] flex items-center justify-between text-xs font-mono text-[var(--stable-bright)] font-semibold">
                <span>5 Real Compilers</span>
                <span>Interactive Stdin ➔</span>
              </div>
            </div>

            {/* Pillar 3: Surgical AI Code Doctor */}
            <div className="p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--mist)] hover:border-[var(--fracture-border)] transition-all duration-300 flex flex-col justify-between shadow-xs group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[var(--fracture-subtle)] border border-[var(--fracture-border)]/50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  🩺
                </div>
                <div className="text-xs font-mono text-[var(--fracture-bright)] uppercase tracking-wider font-bold mb-1">
                  Pillar 03
                </div>
                <h3 className="text-lg font-sans font-bold text-[var(--text-primary)] mb-2.5">
                  Surgical AI Code Doctor
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                  Ordinary AI assistants replace your entire file, obliterating your custom code.
                  Faultline isolates the exact line range (e.g. Lines 3-4) and splices fixes directly into your editor buffer.
                </p>
              </div>
              <div className="pt-4 border-t border-[var(--mist)] flex items-center justify-between text-xs font-mono text-[var(--fracture-bright)] font-semibold">
                <span>Line-Level Splicing</span>
                <span>Zero Overwrites ➔</span>
              </div>
            </div>

            {/* Pillar 4: O(1) LRU Execution Cache */}
            <div className="p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--mist)] hover:border-[var(--cracked-border)] transition-all duration-300 flex flex-col justify-between shadow-xs group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[var(--cracked-subtle)] border border-[var(--cracked-border)]/50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  ⚡
                </div>
                <div className="text-xs font-mono text-[var(--cracked-bright)] uppercase tracking-wider font-bold mb-1">
                  Pillar 04
                </div>
                <h3 className="text-lg font-sans font-bold text-[var(--text-primary)] mb-2.5">
                  High-Performance LRU Cache
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                  Powered by an object-oriented Doubly-Linked List + Hash Map data structure.
                  SHA-256 fingerprinting ensures repeated compilations and executions return in &lt; 1 millisecond.
                </p>
              </div>
              <div className="pt-4 border-t border-[var(--mist)] flex items-center justify-between text-xs font-mono text-[var(--cracked-bright)] font-semibold">
                <span>O(1) Access</span>
                <span>Sub-ms Response ➔</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive 5-Step Pipeline Walkthrough ──────────────────────────── */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-[var(--surface-1)]/30 border-b border-[var(--mist)]">
        <div className="max-w-[1400px] mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-14">
            <Badge variant="stable" size="md" className="mb-3">
              🔄 End-to-End Remediation Pipeline
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-sans font-black tracking-tight text-[var(--text-primary)] mb-4">
              How Faultline Traverses Mental Models
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Experience the 5-stage closed loop: from initial concept synthesis to cognitive faultline detection, surgical line patching, and concept stabilization.
            </p>
          </div>

          {/* Pipeline Steps Flow */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative">
            {[
              {
                step: "01",
                emoji: "🌋",
                title: "Synthesize Strata",
                desc: "User enters any programming topic. Gemini 3.5 generates a multi-depth concept graph from Bedrock to Apex.",
                badge: "DAG Generation",
              },
              {
                step: "02",
                emoji: "🎯",
                title: "Diagnostic Probe",
                desc: "Faultline presents calibrated questions containing distractors matching common intuitive traps.",
                badge: "Distractor Probing",
              },
              {
                step: "03",
                emoji: "⚡",
                title: "Pinpoint Faultline",
                desc: "Incorrect responses isolate the exact cognitive misconception rather than just labeling it 'wrong'.",
                badge: "Fault Detection",
              },
              {
                step: "04",
                emoji: "🩺",
                title: "Surgical Line Fix",
                desc: "The AI Code Doctor pinpoints the exact line numbers and presents a surgical visual diff.",
                badge: "Lines 3-4 Isolated",
              },
              {
                step: "05",
                emoji: "✅",
                title: "Stabilize Node",
                desc: "Re-compiling against the native compiler verifies execution and turns the concept node emerald Stable.",
                badge: "Mastery Confirmed",
              },
            ].map((stage) => (
              <div
                key={stage.step}
                className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--mist)] flex flex-col justify-between shadow-xs hover:border-[var(--ink-bright)] transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{stage.emoji}</span>
                    <span className="text-xs font-mono font-extrabold text-[var(--text-tertiary)] group-hover:text-[var(--ink-bright)] transition-colors">
                      STAGE {stage.step}
                    </span>
                  </div>
                  <h4 className="text-sm font-sans font-bold text-[var(--text-primary)] mb-2">
                    {stage.title}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {stage.desc}
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-[var(--mist)] text-[10px] font-mono text-[var(--ink-bright)] font-semibold">
                  {stage.badge}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Performance Metrics & Benchmarks ───────────────────────────── */}
      <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 border-b border-[var(--mist)] bg-[var(--surface-0)]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--mist)]">
            <div className="text-3xl sm:text-4xl font-sans font-black text-[var(--ink-bright)] mb-1">
              5
            </div>
            <div className="text-xs font-mono text-[var(--text-secondary)] uppercase font-semibold">
              Supported Compilers
            </div>
            <div className="text-[10px] font-mono text-[var(--text-tertiary)] mt-1">
              C (GCC) • C++ • Python • Node • Java
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--mist)]">
            <div className="text-3xl sm:text-4xl font-sans font-black text-[var(--stable-bright)] mb-1">
              &lt; 1ms
            </div>
            <div className="text-xs font-mono text-[var(--text-secondary)] uppercase font-semibold">
              LRU Execution Cache
            </div>
            <div className="text-[10px] font-mono text-[var(--text-tertiary)] mt-1">
              Doubly-Linked List + Hash Map
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--mist)]">
            <div className="text-3xl sm:text-4xl font-sans font-black text-[var(--fracture-bright)] mb-1">
              100%
            </div>
            <div className="text-xs font-mono text-[var(--text-secondary)] uppercase font-semibold">
              Native Toolchains
            </div>
            <div className="text-[10px] font-mono text-[var(--text-tertiary)] mt-1">
              Real stdout/stderr • Zero mock outputs
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--mist)]">
            <div className="text-3xl sm:text-4xl font-sans font-black text-[var(--cracked-bright)] mb-1">
              24/7
            </div>
            <div className="text-xs font-mono text-[var(--text-secondary)] uppercase font-semibold">
              Dual Palette Harmony
            </div>
            <div className="text-[10px] font-mono text-[var(--text-tertiary)] mt-1">
              Pure Black Night 🌙 &amp; Crisp Day ☀️
            </div>
          </div>
        </div>
      </section>

      {/* ── Launchpad CTA Banner ────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-[radial-gradient(ellipse_at_top,var(--surface-2)_0%,var(--surface-0)_80%)]">
        <div className="max-w-[1000px] mx-auto p-8 sm:p-12 rounded-3xl bg-[var(--surface-1)] border border-[var(--ink-border)]/40 shadow-xl text-center relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--ink-bright)] opacity-10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[var(--fracture-bright)] opacity-10 rounded-full blur-3xl pointer-events-none" />

          <span className="text-3xl mb-3 block">🌋 💻 📖</span>
          <h2 className="text-2xl sm:text-4xl font-sans font-black tracking-tight text-[var(--text-primary)] mb-4">
            Ready to Traverse Your Cognitive Strata?
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed mb-8">
            Experience the future of diagnostic programming. Choose an entry point below to get started in seconds.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/strata">
              <Button variant="primary" size="lg" className="font-mono text-sm px-6 py-3 cursor-pointer">
                🌋 Launch Strata Explorer
              </Button>
            </Link>

            <Link href="/terminal">
              <Button variant="danger" size="lg" className="font-mono text-sm px-6 py-3 bg-[var(--fracture-bright)] hover:bg-[var(--fracture)] text-white cursor-pointer">
                💻 Open Terminal &amp; AI Doctor
              </Button>
            </Link>

            <Link href="/codex">
              <Button variant="secondary" size="lg" className="font-mono text-sm px-6 py-3 border border-[var(--mist)] cursor-pointer">
                📖 Misconception Codex
              </Button>
            </Link>

            <a
              href="/Faultline_System_Documentation.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" size="lg" className="font-mono text-sm px-6 py-3 border border-[var(--mist)] hover:border-[var(--ink-border)] text-[var(--text-primary)] hover:text-[var(--ink-bright)] cursor-pointer">
                📄 System Docs (PDF)
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── Lightbox Zoom Modal ─────────────────────────────────────────────── */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative w-full max-w-6xl aspect-video rounded-xl overflow-hidden border border-white/20 shadow-2xl">
            <Image
              src={lightboxImage}
              alt="Fullscreen Preview"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs font-mono text-white/80 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
              Click anywhere to close fullscreen preview
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
