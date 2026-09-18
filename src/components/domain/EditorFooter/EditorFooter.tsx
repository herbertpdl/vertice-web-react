"use client";

import { Check, CircleX, Info } from "lucide-react";
import { Button, Spinner } from "@/components/ui";
import type { SaveStatus } from "@/lib/workoutEditor/autosave";

interface EditorFooterProps {
  status: SaveStatus;
  /** Shown as a tooltip on the error state, when the failure had a message. */
  errorMessage?: string | null;
  finishing?: boolean;
  onRetry: () => void;
  onFinish: () => void;
}

/** The editor's single save status (R9) plus its only action, "Concluir" (R11). */
export function EditorFooter({ status, errorMessage, finishing, onRetry, onFinish }: EditorFooterProps) {
  return (
    <div className="flex w-full items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-8)] py-[var(--space-4)]">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-[8px] text-[13px] text-[color:var(--color-text-secondary)]"
      >
        {status === "idle" && (
          <>
            <Info width={15} height={15} className="text-[color:var(--color-text-tertiary)]" />
            <span>As alterações são salvas automaticamente</span>
          </>
        )}
        {status === "saving" && (
          <>
            <Spinner size="sm" />
            <span>Salvando…</span>
          </>
        )}
        {status === "saved" && (
          <>
            <Check width={15} height={15} className="text-[color:var(--color-success)]" />
            <span>Salvo</span>
          </>
        )}
        {status === "error" && (
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
        className={status === "saving" && !finishing ? "opacity-60" : ""}
      >
        Concluir
      </Button>
    </div>
  );
}
