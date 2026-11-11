import { ReactNode } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  /** Lets the trigger point at the tooltip with `aria-describedby`. */
  id?: string;
  /** Wraps long content at 320px instead of keeping it on one line. */
  multiline?: boolean;
}

const sideClasses: Record<NonNullable<TooltipProps["side"]>, string> = {
  top: "bottom-full left-1/2 mb-[6px] -translate-x-1/2",
  bottom: "top-full left-1/2 mt-[6px] -translate-x-1/2",
  left: "right-full top-1/2 mr-[6px] -translate-y-1/2",
  right: "left-full top-1/2 ml-[6px] -translate-y-1/2",
};

export function Tooltip({
  content,
  children,
  side = "top",
  className = "",
  id,
  multiline = false,
}: TooltipProps) {
  return (
    <span className={`group relative inline-flex ${className}`}>
      {children}
      <span
        id={id}
        role="tooltip"
        className={`font-base pointer-events-none absolute z-20 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-[12px] py-[8px] text-[12px] font-medium text-[color:var(--color-text-primary)] opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 ${
          multiline ? "w-max max-w-[320px] leading-[1.4] whitespace-normal" : "whitespace-nowrap"
        } ${sideClasses[side]}`}
      >
        {content}
      </span>
    </span>
  );
}
