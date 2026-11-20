import { Trash2 } from "lucide-react";
import { setCountLabel } from "@/lib/workoutEditor/collapse";
import type { EditorExercise } from "@/lib/workoutEditor/model";

/** A saved exercise the proposal removes (R33): struck through, read-only, gone on "Aplicar". */
export function RemovedExerciseCard({ exercise }: { exercise: EditorExercise }) {
  return (
    <div
      role="group"
      aria-label={`Removido pela proposta: ${exercise.exercise.name}`}
      className="flex w-full items-center justify-between gap-[var(--space-4)] rounded-[var(--radius-lg)] border border-dashed border-[var(--color-danger)] bg-[#ff5c5c0a] px-[var(--space-5)] py-[var(--space-4)] opacity-80"
    >
      <div className="flex items-center gap-[var(--space-3)]">
        <Trash2 width={16} height={16} className="text-[color:var(--color-danger)]" aria-hidden />
        <span className="font-heading text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-secondary)] line-through">
          {exercise.exercise.name}
        </span>
        <span className="text-[12px] text-[color:var(--color-text-tertiary)] line-through">
          {setCountLabel(exercise.sets.length)}
        </span>
      </div>
      <span className="rounded-[var(--radius-full)] bg-[#ff5c5c26] px-[10px] py-[3px] text-[11px] font-semibold text-[color:var(--color-danger)]">
        Removido
      </span>
    </div>
  );
}
