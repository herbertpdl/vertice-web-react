"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface DialogProps {
  title: string;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
  className?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function Dialog({ title, onClose, width = 440, children, className = "" }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    focusable?.[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const items = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0e14e8] p-[var(--space-4)]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        style={{ width }}
        className={`font-base flex max-h-[90vh] flex-col gap-[var(--space-5)] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-[var(--space-6)] ${className}`}
      >
        <div className="flex items-center justify-between gap-[var(--space-4)]">
          <h2
            id="dialog-title"
            className="font-heading text-[length:var(--text-lg)] font-semibold text-[color:var(--color-text-primary)]"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[color:var(--color-text-primary)]"
          >
            <X width={16} height={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full items-center justify-end gap-[var(--space-3)]">
      {children}
    </div>
  );
}
