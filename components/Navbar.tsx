"use client";

import React from "react";
import Link from "next/link";
import HeroScene from "@/components/HeroScene";
import ThemeToggle from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/Badge";

export interface NavbarProps {
  activeRoute?: "/" | "/strata" | "/terminal" | "/codex";
}

export default function Navbar({ activeRoute = "/" }: NavbarProps) {
  const navLinks = [
    { href: "/", label: "Overview", icon: "✨" },
    { href: "/strata", label: "Strata Explorer", icon: "🌋" },
    { href: "/terminal", label: "Live Terminal & Doctor", icon: "💻" },
    { href: "/codex", label: "Misconception Codex", icon: "📖" },
  ];

  return (
    <header className="border-b border-[var(--mist)] bg-[var(--header-bg)] backdrop-blur-md sticky top-0 z-30 transition-colors duration-200 shrink-0 w-full">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6">
          {/* Left: Brand + 3D Emblem + Gemini Badge */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group focus-visible:outline-none">
              <HeroScene size={36} className="w-[36px] h-[36px] transition-transform group-hover:scale-105" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-sans font-extrabold tracking-tight text-[var(--text-primary)] group-hover:text-[var(--ink-bright)] transition-colors">
                    FAULTLINE
                  </span>
                  <Badge variant="ink" size="sm" className="hidden sm:inline-flex">
                    ⚡ Gemini 3.5 Lite
                  </Badge>
                </div>
                <span className="text-[11px] font-mono text-[var(--text-tertiary)] -mt-0.5">
                  Adaptive Cognitive Strata
                </span>
              </div>
            </Link>

            {/* Mobile-only theme toggle display */}
            <div className="flex md:hidden items-center gap-2">
              <ThemeToggle showLabel={false} />
            </div>
          </div>

          {/* Center: Navigation Links — Responsive with compact labels on mobile */}
          <nav className="flex items-center gap-1 sm:gap-2 p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--mist)] text-xs font-mono overflow-x-auto no-scrollbar max-w-full shrink-0">
            {navLinks.map((link) => {
              const isActive = activeRoute === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium select-none shrink-0 text-[11px] sm:text-xs ${
                    isActive
                      ? "bg-[var(--surface-1)] text-[var(--ink-bright)] font-bold shadow-xs border border-[var(--mist)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)]/50"
                  }`}
                >
                  <span className="text-xs sm:text-sm">{link.icon}</span>
                  {link.href === "/" && <span>Home</span>}
                  {link.href === "/strata" && (
                    <span>
                      Strata<span className="hidden sm:inline"> Explorer</span>
                    </span>
                  )}
                  {link.href === "/terminal" && (
                    <span>
                      Terminal<span className="hidden sm:inline"> &amp; Doctor</span>
                    </span>
                  )}
                  {link.href === "/codex" && (
                    <span>
                      <span className="hidden sm:inline">Misconception </span>Codex
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right: Engine Status Indicator + Global Theme Toggle */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--mist)] text-xs font-mono text-[var(--text-secondary)]">
              <span className="w-2 h-2 rounded-full bg-[var(--stable-bright)] animate-pulse" />
              <span>Engine Ready</span>
            </div>
            <ThemeToggle showLabel={true} />
          </div>
        </div>
      </div>
    </header>
  );
}
