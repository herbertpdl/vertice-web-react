import { HTMLAttributes } from "react";

export type BadgeVariant = "primary" | "success" | "danger" | "neutral" | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: "bg-[#00e5ff26] text-[color:var(--color-primary)]",
  success: "bg-[#2ed57326] text-[color:var(--color-success)]",
  danger: "bg-[#ff5c5c26] text-[color:var(--color-danger)]",
  neutral: "bg-[var(--color-surface-hover)] text-[color:var(--color-text-secondary)]",
  // The admin directory's "Treinador" (pen.dev Admin Badge `vzj0m` with `#4DA6FF26` / `$color-info`).
  info: "bg-[#4da6ff26] text-[color:var(--color-info)]",
};

export function Badge({
  variant = "neutral",
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={`font-base inline-flex items-center rounded-[var(--radius-full)] px-[10px] py-[4px] text-[11px] font-semibold ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
