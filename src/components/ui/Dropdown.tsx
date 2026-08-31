"use client";

import { useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  label?: string;
  placeholder?: string;
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function Dropdown({
  label,
  placeholder = "Select an option",
  options,
  value,
  onChange,
  disabled,
  className = "",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  return (
    <div
      ref={containerRef}
      className={`font-base relative flex flex-col gap-[6px] ${
        disabled ? "opacity-35" : ""
      } ${className}`}
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      {label && (
        <label
          htmlFor={id}
          className="text-[var(--text-xs)] font-semibold text-[var(--color-text-secondary)]"
        >
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-2 border bg-[var(--color-surface)] px-[14px] py-[10px] text-[var(--text-base)] transition-colors ${
          open
            ? "rounded-t-[var(--radius-md)] border-[var(--color-primary)]"
            : "rounded-[var(--radius-md)] border-[var(--color-border)]"
        }`}
      >
        <span
          className={
            selected
              ? "text-[var(--color-text-primary)]"
              : "text-[var(--color-text-tertiary)]"
          }
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          width={16}
          height={16}
          className={`text-[var(--color-text-secondary)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute top-full left-0 z-10 flex w-full flex-col gap-0 rounded-b-[var(--radius-md)] border border-t-0 border-[var(--color-border)] bg-[var(--color-surface)] p-[6px]"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange?.(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-[10px] py-[9px] text-left text-[var(--text-base)] hover:bg-[var(--color-surface-hover)] ${
                    isSelected
                      ? "bg-[var(--color-surface-hover)] text-[var(--color-primary)]"
                      : "text-[var(--color-text-primary)]"
                  }`}
                >
                  {option.label}
                  {isSelected && <Check width={14} height={14} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
