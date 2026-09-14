"use client";

import { useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
}

export type DropdownSize = "md" | "compact";

interface DropdownProps {
  label?: string;
  placeholder?: string;
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  size?: DropdownSize;
  className?: string;
}

const sizeStyles: Record<
  DropdownSize,
  {
    trigger: string;
    triggerRadius: string;
    triggerRadiusOpen: string;
    menuRadiusBottom: string;
    menuBg: string;
    chevronSize: number;
  }
> = {
  md: {
    trigger:
      "px-[14px] py-[10px] text-[length:var(--text-base)] bg-[var(--color-surface)]",
    triggerRadius: "rounded-[var(--radius-md)]",
    triggerRadiusOpen: "rounded-t-[var(--radius-md)]",
    menuRadiusBottom: "rounded-b-[var(--radius-md)]",
    menuBg: "bg-[var(--color-surface)]",
    chevronSize: 16,
  },
  compact: {
    trigger:
      "px-[10px] py-[7px] text-[length:var(--text-xs)] bg-[var(--color-bg)]",
    triggerRadius: "rounded-[var(--radius-sm)]",
    triggerRadiusOpen: "rounded-t-[var(--radius-sm)]",
    menuRadiusBottom: "rounded-b-[var(--radius-sm)]",
    menuBg: "bg-[var(--color-bg)]",
    chevronSize: 14,
  },
};

export function Dropdown({
  label,
  placeholder = "Select an option",
  options,
  value,
  onChange,
  disabled,
  size = "md",
  className = "",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  const styles = sizeStyles[size];

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
          className="text-[length:var(--text-xs)] font-semibold text-[color:var(--color-text-secondary)]"
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
        className={`flex w-full items-center justify-between gap-2 border ${styles.trigger} transition-colors ${
          open
            ? `${styles.triggerRadiusOpen} border-[var(--color-primary)]`
            : `${styles.triggerRadius} border-[var(--color-border)]`
        }`}
      >
        <span
          className={
            selected
              ? "text-[color:var(--color-text-primary)]"
              : "text-[color:var(--color-text-tertiary)]"
          }
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          width={styles.chevronSize}
          height={styles.chevronSize}
          className={`text-[color:var(--color-text-secondary)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className={`absolute top-full left-0 z-10 flex w-full flex-col gap-0 ${styles.menuRadiusBottom} border border-t-0 border-[var(--color-border)] ${styles.menuBg} p-[6px]`}
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
                  className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-[10px] py-[9px] text-left text-[length:var(--text-base)] hover:bg-[var(--color-surface-hover)] ${
                    isSelected
                      ? "bg-[var(--color-surface-hover)] text-[color:var(--color-primary)]"
                      : "text-[color:var(--color-text-primary)]"
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
