"use client";

import type { Ref } from "react";
import { Check, CircleX, Info, Sparkles } from "lucide-react";
import { REVIEW_STATUS } from "@/lib/assistant/copy";
import { Button, Spinner } from "@/components/ui";
import type { SaveStatus } from "@/lib/workoutEditor/autosave";

interface EditorFooterProps {
  status: SaveStatus;
  /** Shown as a tooltip on the error state, when the failure had a message. */
  errorMessage?: string | null;
  finishing?: boolean;
  onRetry: () => void;
  onFinish: () => void;
  /** An AI proposal is in review: nothing saves until "Aplicar" (ai-workout-assistant R45). */
  review?: boolean;
  /** The editor measures the footer to keep focused fields clear of it (scroll-padding). */
  ref?: Ref<HTMLDivElement>;
}

/**
 * The editor's single save status (R9) plus its only action, "Concluir" (R11). Sticky to the
 * viewport bottom so both stay visible however long the workout gets.
 */
export function EditorFooter({
  status,
  errorMessage,
  finishing,
  onRetry,
  onFinish,
  review = false,
  ref,
}: EditorFooterProps) {
  return (
    <div
      ref={ref}
      className="sticky bottom-0 z-10 flex w-full items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-8)] py-[var(--space-4)]"
    >
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-[8px] text-[13px] text-[color:var(--color-text-secondary)]"
      >
        {review && (
          <>
            <Sparkles width={15} height={15} className="text-[color:var(--color-secondary-hover)]" />
            <span className="font-semibold text-[color:var(--color-text-primary)]">{REVIEW_STATUS}</span>
          </>
        )}
        {!review && status === "idle" && (
          <>
            <Info width={15} height={15} className="text-[color:var(--color-text-tertiary)]" />
            <span>As alterações são salvas automaticamente</span>
          </>
        )}
        {!review && status === "saving" && (
          <>
            <Spinner size="sm" />
            <span>Salvando…</span>
          </>
        )}
        {!review && status === "saved" && (
          <>
            <Check width={15} height={15} className="text-[color:var(--color-success)]" />
            <span>Salvo</span>
          </>
        )}
        {!review && status === "error" && (
          <>
            <CircleX width={15} height={15} className="text-[color:var(--color-danger)]" />
            <span className="text-[color:var(--color-danger)]" title={errorMessage ?? undefined}>
              Erro ao salvar —
            </span>
            <button
              type="button"
              onClick={onRetry}
              className="font-semibold text-[color:var(--color-primary)] hover:opacity-80"
            >
              Tentar novamente
            </button>
          </>
        )}
      </div>
      <Button
        // `loading` only blocks pointer events; Enter/Space on the focused
        // button would otherwise start a second finish flow.
        onClick={finishing ? undefined : onFinish}
        loading={finishing}
        className={!review && status === "saving" && !finishing ? "opacity-60" : ""}
      >
        Concluir
      </Button>
    </div>
  );
}
