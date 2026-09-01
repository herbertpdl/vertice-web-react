import { ReactNode } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
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
}: TooltipProps) {
  return (
    <span className={`group relative inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`font-base pointer-events-none absolute z-20 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-[12px] py-[8px] text-[12px] font-medium whitespace-nowrap text-[color:var(--color-text-primary)] opacity-0 transition-opacity group-hover:opacity-100 ${sideClasses[side]}`}
      >
        {content}
      </span>
    </span>
  );
}
