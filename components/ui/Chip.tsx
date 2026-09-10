import React, { forwardRef } from "react";

export type ChipStatus = "locked" | "available" | "cracked" | "stable" | "default";

export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  status?: ChipStatus;
  isActive?: boolean;
  tooltip?: string;
  icon?: React.ReactNode;
  maxWidth?: string;
  clickable?: boolean;
}

export const Chip = forwardRef<HTMLDivElement, ChipProps>(
  (
    {
      label,
      status = "default",
      isActive = false,
      tooltip,
      icon,
      maxWidth = "clamp(120px, 25vw, 260px)",
      clickable = false,
      onClick,
      className = "",
      style,
      ...props
    },
    ref
  ) => {
    // Requirements:
    // 1. width: fit-content
    // 2. max-width clamp
    // 3. ellipsis truncation
    // 4. native tooltip (title attribute)
    // 5. prefers-reduced-motion respected

    const isInteractive = clickable || !!onClick;

    const baseStyles: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      width: "fit-content",
      maxWidth: maxWidth,
      borderRadius: "var(--radius-pill, 999px)",
      padding: "0.3rem 0.75rem",
      fontSize: "var(--text-sm, 0.8125rem)",
      fontFamily: "var(--font-sans)",
      fontWeight: 500,
      lineHeight: 1.3,
      gap: "0.375rem",
      userSelect: "none",
      cursor: isInteractive ? "pointer" : "default",
      transition: "all var(--duration-base, 150ms) var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1))",
      borderWidth: "1px",
      borderStyle: "solid",
      position: "relative",
    };

    const statusStyles: Record<ChipStatus, React.CSSProperties> = {
      default: {
        backgroundColor: "var(--surface-2)",
        borderColor: "var(--mist)",
        color: "var(--text-primary)",
      },
      locked: {
        backgroundColor: "var(--surface-2)",
        borderColor: "var(--mist)",
        color: "var(--text-secondary)",
        opacity: 0.85,
      },
      available: {
        backgroundColor: "var(--ink-subtle)",
        borderColor: "var(--ink-border)",
        color: "var(--ink-bright)",
        fontWeight: 600,
      },
      cracked: {
        backgroundColor: "var(--cracked-subtle)",
        borderColor: "var(--cracked-border)",
        color: "var(--cracked-bright)",
        fontWeight: 600,
      },
      stable: {
        backgroundColor: "var(--stable-subtle)",
        borderColor: "var(--stable-border)",
        color: "var(--stable-bright)",
        fontWeight: 600,
      },
    };

    const activeStyle: React.CSSProperties = isActive
      ? {
          boxShadow: "0 0 0 2px var(--ink-bright, #2e47a4)",
          borderColor: "var(--ink-bright, #2e47a4)",
        }
      : {};

    const textStyles: React.CSSProperties = {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      display: "block",
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if ((e.key === "Enter" || e.key === " ") && onClick && isInteractive) {
        e.preventDefault();
        onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
      }
      props.onKeyDown?.(e);
    };

    return (
      <div
        ref={ref}
        title={tooltip ?? label}
        onClick={isInteractive ? onClick : undefined}
        onKeyDown={handleKeyDown}
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        aria-label={label}
        className={`prometheus-chip ${
          isInteractive
            ? "hover:brightness-110 active:scale-98 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink-bright,#2e47a4)]"
            : ""
        } ${className}`}
        style={{
          ...baseStyles,
          ...statusStyles[status],
          ...activeStyle,
          ...style,
        }}
        {...props}
      >
        {icon && <span style={{ flexShrink: 0, display: "inline-flex" }}>{icon}</span>}
        <span style={textStyles}>{label}</span>
        <style jsx>{`
          @media (prefers-reduced-motion: reduce) {
            .prometheus-chip {
              transition: none !important;
            }
          }
        `}</style>
      </div>
    );
  }
);

Chip.displayName = "Chip";
export default Chip;
