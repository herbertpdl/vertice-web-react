import { InputHTMLAttributes, forwardRef, useId } from "react";

interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  helpText?: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, helpText, error, className = "", id, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;

    return (
      <div className={`font-base flex flex-col gap-[6px] ${className}`}>
        {label && (
          <label
            htmlFor={fieldId}
            className="text-[var(--text-xs)] font-semibold text-[var(--color-text-secondary)]"
          >
            {label}
          </label>
        )}
        <div
          className={`flex w-full items-center gap-2 rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-[14px] py-[10px] transition-colors focus-within:border-[var(--color-primary)] ${
            error
              ? "border-[var(--color-danger)]"
              : "border-[var(--color-border)]"
          } ${props.disabled ? "opacity-35" : ""}`}
        >
          <input
            ref={ref}
            id={fieldId}
            className="w-full bg-transparent text-[var(--text-base)] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)]"
            {...props}
          />
        </div>
        {(helpText || error) && (
          <span
            className={`text-[11px] ${
              error
                ? "text-[var(--color-danger)]"
                : "text-[var(--color-text-tertiary)]"
            }`}
          >
            {error || helpText}
          </span>
        )}
      </div>
    );
  },
);

TextField.displayName = "TextField";
