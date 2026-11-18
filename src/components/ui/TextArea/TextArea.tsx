import { TextareaHTMLAttributes, forwardRef, useId } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helpText?: string;
  error?: string;
}

/**
 * A multi-line text field (pen.dev "Motivo Field" in `oY0tG` / `mS7wU`): a label with a red `*`
 * when `required`, a 104 px box on the page background that turns primary on focus and danger on
 * `error`, and a help or error line under it. `required` marks the field (`aria-required`) without
 * the browser's own validation bubble: callers check the value (e.g. a trimmed reason) themselves.
 * `maxLength` counts UTF-16 code units, like vertice-api.
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, helpText, error, required, className = "", id, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const hintId = `${fieldId}-hint`;
    const hint = error || helpText;

    return (
      <div className={`font-base flex flex-col gap-[6px] ${className}`}>
        {label && (
          <label
            htmlFor={fieldId}
            className="flex gap-[4px] text-[length:var(--text-xs)] font-semibold text-[color:var(--color-text-secondary)]"
          >
            {label}
            {required && (
              <span aria-hidden="true" className="font-bold text-[color:var(--color-danger)]">
                *
              </span>
            )}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint ? hintId : undefined}
          className={`h-[104px] w-full resize-none rounded-[var(--radius-md)] border bg-[var(--color-bg)] px-[14px] py-[10px] text-[length:var(--text-base)] leading-[1.5] text-[color:var(--color-text-primary)] transition-colors outline-none placeholder:text-[color:var(--color-text-tertiary)] focus:border-[var(--color-primary)] disabled:opacity-35 ${
            error ? "border-[var(--color-danger)]" : "border-[var(--color-border)]"
          }`}
          {...props}
        />
        {hint && (
          <span
            id={hintId}
            className={`text-[11px] ${
              error ? "text-[color:var(--color-danger)]" : "text-[color:var(--color-text-tertiary)]"
            }`}
          >
            {hint}
          </span>
        )}
      </div>
    );
  },
);

TextArea.displayName = "TextArea";
