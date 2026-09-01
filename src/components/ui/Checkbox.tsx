import { InputHTMLAttributes, forwardRef } from "react";
import { Check } from "lucide-react";

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = "", id, checked, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className={`font-base inline-flex items-center gap-[10px] ${
          props.disabled ? "opacity-35" : "cursor-pointer"
        } ${className}`}
      >
        <input
          ref={ref}
          type="checkbox"
          id={id}
          checked={checked}
          className="peer sr-only"
          {...props}
        />
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-[1.5px] transition-colors ${
            checked
              ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
              : "border-[var(--color-border-strong)] bg-transparent"
          }`}
        >
          {checked && (
            <Check
              width={13}
              height={13}
              className="text-[color:var(--color-primary-text)]"
            />
          )}
        </span>
        {label && (
          <span
            className={`text-[length:var(--text-base)] ${
              checked
                ? "text-[color:var(--color-text-primary)]"
                : "text-[color:var(--color-text-secondary)]"
            }`}
          >
            {label}
          </span>
        )}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
