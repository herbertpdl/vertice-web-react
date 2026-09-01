import { ButtonHTMLAttributes, forwardRef } from "react";
import { Spinner } from "./Spinner";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary)] text-[color:var(--color-primary-text)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]",
  secondary:
    "bg-[var(--color-secondary)] text-[color:var(--color-text-primary)] hover:bg-[var(--color-secondary-hover)] active:bg-[var(--color-secondary-active)]",
  outline:
    "bg-transparent border border-[var(--color-border-strong)] text-[color:var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-primary)] hover:text-[color:var(--color-primary)]",
  ghost:
    "bg-transparent text-[color:var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[color:var(--color-primary)]",
  danger:
    "bg-[var(--color-danger)] text-[color:var(--color-bg)] hover:bg-[var(--color-danger-hover)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "py-[7px] px-[14px] text-[length:var(--text-sm)]",
  md: "py-[10px] px-[20px] text-[length:var(--text-base)]",
  lg: "py-[14px] px-[28px] text-[length:var(--text-md)]",
};

const loadingSpinnerClasses: Record<ButtonVariant, string> = {
  primary: "text-[color:var(--color-primary-text)]",
  secondary: "text-[color:var(--color-text-primary)]",
  outline: "text-[color:var(--color-text-primary)]",
  ghost: "text-[color:var(--color-text-secondary)]",
  danger: "text-[color:var(--color-bg)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", loading = false, className = "", children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        aria-busy={loading}
        className={`font-base inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-semibold transition-colors disabled:opacity-35 disabled:pointer-events-none ${variantClasses[variant]} ${sizeClasses[size]} ${loading ? "opacity-85 pointer-events-none" : ""} ${className}`}
        {...props}
      >
        {loading && <Spinner size="sm" className={loadingSpinnerClasses[variant]} />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
