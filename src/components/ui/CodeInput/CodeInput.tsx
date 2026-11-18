"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { CircleAlert } from "lucide-react";

export const CODE_LENGTH = 6;

interface CodeInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "size"> {
  /** Digits only, at most six. */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
}

/**
 * The six-digit authenticator code (pen.dev Admin 2FA frames `Cv0BV`, `p5TLVn`, `duiOr`,
 * `q9XrXD`): one real `<input>` drawn as six cells, so paste and the OS's one-time-code autofill
 * fill all six at once. Anything that isn't a digit is dropped, then the first six are kept: no
 * `maxLength`, since the browser would cut a pasted "123 456" to "123 45" before the space goes.
 * It never submits by itself.
 */
export const CodeInput = forwardRef<HTMLInputElement, CodeInputProps>(
  (
    { value, onChange, label = "Código de 6 dígitos", error, id, disabled, className = "", onFocus, onBlur, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const errorId = `${fieldId}-error`;
    const [focused, setFocused] = useState(false);
    const digits = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    // The cell the next digit goes into (the last one once all six are in).
    const active = Math.min(digits.length, CODE_LENGTH - 1);

    return (
      <div className={`font-base flex w-full flex-col gap-[6px] ${className}`}>
        <label
          htmlFor={fieldId}
          className="text-[length:var(--text-xs)] font-semibold text-[color:var(--color-text-secondary)]"
        >
          {label}
        </label>
        <div className={`relative flex w-full gap-[8px] ${disabled ? "opacity-35" : ""}`}>
          {Array.from({ length: CODE_LENGTH }, (_, index) => (
            <div
              key={index}
              aria-hidden="true"
              data-cell={index}
              className={`flex h-[52px] flex-1 items-center justify-center rounded-[var(--radius-md)] border bg-[var(--color-bg)] font-heading text-[22px] font-semibold text-[color:var(--color-text-primary)] transition-colors ${
                error
                  ? "border-[var(--color-danger)]"
                  : focused && index === active
                    ? "border-[var(--color-primary)]"
                    : "border-[var(--color-border)]"
              }`}
            >
              {digits[index] ?? ""}
            </div>
          ))}
          <input
            ref={ref}
            id={fieldId}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            spellCheck={false}
            value={digits}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            // Covers the cells, invisible: a click anywhere focuses it, and the caret stays hidden.
            className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
            {...props}
          />
        </div>
        {error && (
          <span id={errorId} className="flex items-center gap-[6px] text-[12px] text-[color:var(--color-danger)]">
            <CircleAlert aria-hidden="true" className="h-[14px] w-[14px] shrink-0" />
            {error}
          </span>
        )}
      </div>
    );
  },
);

CodeInput.displayName = "CodeInput";
