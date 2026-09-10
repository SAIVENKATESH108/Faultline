import React, { forwardRef } from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      className = "",
      style,
      ...props
    },
    ref
  ) => {
    const baseStyles: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      fontFamily: "var(--font-sans)",
      fontWeight: 500,
      borderRadius: "var(--radius-md, 8px)",
      cursor: disabled || isLoading ? "not-allowed" : "pointer",
      opacity: disabled || isLoading ? 0.6 : 1,
      textDecoration: "none",
      transition: "all var(--duration-base, 150ms) var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1))",
      border: "1px solid transparent",
      outline: "none",
      userSelect: "none",
      whiteSpace: "nowrap",
      position: "relative",
    };

    const sizeStyles: Record<"sm" | "md" | "lg", React.CSSProperties> = {
      sm: {
        fontSize: "var(--text-xs, 0.6875rem)",
        padding: "0.375rem 0.75rem",
        height: "2rem",
      },
      md: {
        fontSize: "var(--text-sm, 0.8125rem)",
        padding: "0.5rem 1rem",
        height: "2.5rem",
      },
      lg: {
        fontSize: "var(--text-base, 0.9375rem)",
        padding: "0.625rem 1.25rem",
        height: "2.875rem",
      },
    };

    // Requirements: dark --ink fill, light text, 150ms hover transition
    const variantStyles: Record<NonNullable<ButtonProps["variant"]>, React.CSSProperties> = {
      primary: {
        backgroundColor: "var(--ink, #1e2d5a)",
        color: "var(--ink-fg, #e8edfb)",
        borderColor: "var(--ink-border, #3d5cbf)",
        boxShadow: "var(--shadow-sm)",
      },
      secondary: {
        backgroundColor: "var(--surface-2, #1a1e2e)",
        color: "var(--text-primary, #e8edfb)",
        borderColor: "var(--mist, #2e3350)",
      },
      outline: {
        backgroundColor: "transparent",
        color: "var(--text-primary, #0f172a)",
        borderColor: "var(--ink-border, #3d5cbf)",
      },
      ghost: {
        backgroundColor: "transparent",
        color: "var(--text-secondary, #8891b5)",
        borderColor: "transparent",
      },
      danger: {
        backgroundColor: "var(--fracture-subtle, rgba(192, 57, 43, 0.12))",
        color: "var(--fracture-bright, #e74c3c)",
        borderColor: "var(--fracture-border, #c0392b)",
      },
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`prometheus-button transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
        style={{
          ...baseStyles,
          ...sizeStyles[size],
          ...variantStyles[variant],
          ...style,
        }}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin"
            style={{ width: "1em", height: "1em", flexShrink: 0 }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="30 60"
              style={{ opacity: 0.25 }}
            />
            <path
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              style={{ opacity: 0.75 }}
            />
          </svg>
        )}
        <span>{children}</span>
        <style jsx>{`
          .prometheus-button:hover:not(:disabled) {
            filter: brightness(1.15);
            border-color: var(--ink-bright, #2e47a4);
          }
          .prometheus-button:active:not(:disabled) {
            transform: translateY(1px);
          }
          @media (prefers-reduced-motion: reduce) {
            .prometheus-button {
              transition: none !important;
            }
            .prometheus-button:active:not(:disabled) {
              transform: none !important;
            }
          }
        `}</style>
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
