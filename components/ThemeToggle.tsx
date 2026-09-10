"use client";

import React, { useEffect, useState } from "react";

export interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({
  className = "",
  showLabel = false,
}: ThemeToggleProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check current attribute or localStorage
    const currentTheme =
      (document.documentElement.getAttribute("data-theme") as "dark" | "light") ||
      (localStorage.getItem("faultline-theme") as "dark" | "light") ||
      (localStorage.getItem("prometheus-theme") as "dark" | "light") ||
      (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

    setTheme(currentTheme);
    document.documentElement.setAttribute("data-theme", currentTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    try {
      localStorage.setItem("faultline-theme", nextTheme);
      window.dispatchEvent(new CustomEvent("faultline-theme-change", { detail: nextTheme }));
    } catch {
      // Ignore storage errors in restricted iframe
    }
  };

  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-lg border border-[var(--mist)] bg-[var(--surface-1)] ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "Day" : "Night"} theme`}
      title={`Switch to ${isDark ? "Day (Pure White)" : "Night (Pure Black)"} theme`}
      className={`group relative inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-[var(--ink-bright)] ${
        isDark
          ? "bg-[#10131b] border-[#1f2536] text-[#ffffff] hover:border-[#3b82f6] hover:bg-[#181c28]"
          : "bg-[#ffffff] border-[#e2e8f0] text-[#0f172a] hover:border-[#2563eb] hover:bg-[#f8fafc] shadow-xs"
      } ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {/* Sun Icon (Day mode) */}
        <svg
          className={`w-4 h-4 text-amber-500 transition-transform duration-300 ${
            isDark ? "scale-0 rotate-90 absolute opacity-0" : "scale-100 rotate-0 opacity-100"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>

        {/* Moon Icon (Night mode) */}
        <svg
          className={`w-4 h-4 text-blue-400 transition-transform duration-300 ${
            isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 absolute opacity-0"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </div>

      {showLabel && (
        <span className="text-xs font-medium font-sans tracking-wide">
          {isDark ? "Night" : "Day"}
        </span>
      )}

      {/* Micro dot indicator */}
      <span
        className={`w-1.5 h-1.5 rounded-full transition-colors ${
          isDark ? "bg-blue-400" : "bg-amber-500"
        }`}
      />
    </button>
  );
}
