import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "fracture" | "stable" | "cracked" | "ink" | "neutral";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "fracture",
  size = "md",
  className = "",
  style,
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-mono, monospace)",
    fontWeight: 500,
    borderRadius: "var(--radius-pill, 999px)",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    userSelect: "none",
    transition: "all var(--duration-base, 150ms) var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1))",
  };

  const sizeStyles: Record<"sm" | "md", React.CSSProperties> = {
    sm: {
      fontSize: "var(--text-xs, 0.6875rem)",
      padding: "0.15rem 0.5rem",
      gap: "0.25rem",
    },
    md: {
      fontSize: "var(--text-sm, 0.8125rem)",
      padding: "0.25rem 0.625rem",
      gap: "0.375rem",
    },
  };

  // Requirement: for misconception labels, --fracture colored border and text on a light tinted background
  const variantStyles: Record<NonNullable<BadgeProps["variant"]>, React.CSSProperties> = {
    fracture: {
      backgroundColor: "var(--fracture-subtle, rgba(192, 57, 43, 0.12))",
      borderColor: "var(--fracture-border, #c0392b)",
      color: "var(--fracture-bright, #e74c3c)",
      borderWidth: "1px",
      borderStyle: "solid",
    },
    stable: {
      backgroundColor: "var(--stable-subtle, rgba(26, 127, 100, 0.12))",
      borderColor: "var(--stable-border, #1a7f64)",
      color: "var(--stable-bright, #27ae8f)",
      borderWidth: "1px",
      borderStyle: "solid",
    },
    cracked: {
      backgroundColor: "var(--cracked-subtle, rgba(180, 83, 9, 0.12))",
      borderColor: "var(--cracked-border, #b45309)",
      color: "var(--cracked-bright, #d97706)",
      borderWidth: "1px",
      borderStyle: "solid",
    },
    ink: {
      backgroundColor: "var(--ink-subtle, rgba(46, 71, 164, 0.10))",
      borderColor: "var(--ink-border, #3d5cbf)",
      color: "var(--ink-bright, #2e47a4)",
      borderWidth: "1px",
      borderStyle: "solid",
    },
    neutral: {
      backgroundColor: "var(--surface-2, #1a1e2e)",
      borderColor: "var(--mist, #2e3350)",
      color: "var(--mist-fg, #8891b5)",
      borderWidth: "1px",
      borderStyle: "solid",
    },
  };

  return (
    <span
      className={`prometheus-badge ${className}`}
      style={{
        ...baseStyles,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {children}
      <style jsx>{`
        @media (prefers-reduced-motion: reduce) {
          .prometheus-badge {
            transition: none !important;
          }
        }
      `}</style>
    </span>
  );
};

export default Badge;
