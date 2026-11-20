"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui";

interface ReviewBannerProps {
  onApply: () => void;
  onDiscard: () => void;
  /** "Aplicar" is running (the save it starts). */
  applying?: boolean;
  /** A message is still being processed: applying now would race the next proposal. */
  disabled?: boolean;
}

/** A proposal in review (R34, R44; frame `HkumZ`): nothing is saved until "Aplicar". */
export function ReviewBanner({ onApply, onDiscard, applying, disabled }: ReviewBannerProps) {
  return (
    <div
      role="region"
      aria-label="Proposta da IA em revisão"
      className="flex w-full flex-wrap items-center gap-[var(--space-4)] rounded-[var(--radius-lg)] border border-[var(--color-secondary)] bg-[#7c4dff14] px-[var(--space-5)] py-[var(--space-4)]"
    >
      <Sparkles width={20} height={20} className="shrink-0 text-[color:var(--color-secondary-hover)]" aria-hidden />
      <div className="flex min-w-[220px] flex-1 flex-col gap-[2px]">
        <span className="font-heading text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
          Proposta da IA em revisão
        </span>
        <span className="text-[length:var(--text-sm)] text-[color:var(--color-text-secondary)]">
          Nada foi salvo ainda. Revise as marcações, ajuste o que quiser e aplique para salvar.
        </span>
      </div>
      <div className="flex items-center gap-[var(--space-3)]">
        <Button variant="outline" onClick={onDiscard} disabled={applying || disabled}>
          Descartar
        </Button>
        <Button variant="secondary" onClick={applying ? undefined : onApply} loading={applying} disabled={disabled}>
          Aplicar
        </Button>
      </div>
    </div>
  );
}
