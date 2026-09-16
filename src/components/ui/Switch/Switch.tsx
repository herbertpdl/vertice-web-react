import { InputHTMLAttributes, forwardRef } from "react";

interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, className = "", id, checked, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className={`font-base inline-flex items-center justify-between gap-[var(--space-4)] ${
          props.disabled ? "opacity-35" : "cursor-pointer"
        } ${className}`}
      >
        {label && (
          <span className="text-[length:var(--text-base)] text-[color:var(--color-text-primary)]">
            {label}
          </span>
        )}
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          id={id}
          checked={checked}
          className="peer sr-only"
          {...props}
        />
        <span
          className={`flex h-6 w-10 shrink-0 items-center rounded-[var(--radius-full)] p-[3px] transition-colors ${
            checked
              ? "justify-end bg-[var(--color-primary)]"
              : "justify-start bg-[var(--color-border-strong)]"
          }`}
        >
          <span
            className={`h-[18px] w-[18px] rounded-full ${
              checked
                ? "bg-[var(--color-primary-text)]"
                : "bg-[var(--color-text-secondary)]"
            }`}
          />
        </span>
      </label>
    );
  },
);

Switch.displayName = "Switch";
