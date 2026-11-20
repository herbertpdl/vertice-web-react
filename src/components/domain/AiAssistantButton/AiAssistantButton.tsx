"use client";

import { Sparkles } from "lucide-react";
import { Spinner } from "@/components/ui";

interface AiAssistantButtonProps {
  open: boolean;
  /** A message is being processed (R47–R49): the label says so while the panel is closed. */
  busy: boolean;
  onClick: () => void;
}

/**
 * Opens and closes the assistant's panel (R3). It sits outside the editor's lock, so the trainer
 * can always reopen the panel and stop a change being built (R49).
 */
export function AiAssistantButton({ open, busy, onClick }: AiAssistantButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? "Fechar assistente IA" : busy ? "Abrir assistente IA, trabalhando" : "Abrir assistente IA"}
      className={`font-base inline-flex items-center justify-center gap-[8px] rounded-[var(--radius-md)] border px-[16px] py-[9px] text-[length:var(--text-base)] font-semibold transition-colors ${
        open
          ? "border-[var(--color-secondary)] bg-[#7c4dff26] text-[color:var(--color-text-primary)]"
          : "border-[var(--color-secondary)] bg-transparent text-[color:var(--color-secondary-hover)] hover:bg-[#7c4dff1a]"
      }`}
    >
      {busy && !open ? (
        <>
          <Spinner size="sm" className="!h-[15px] !w-[15px]" />
          IA trabalhando…
        </>
      ) : (
        <>
          <Sparkles width={16} height={16} aria-hidden />
          Assistente IA
        </>
      )}
    </button>
  );
}
