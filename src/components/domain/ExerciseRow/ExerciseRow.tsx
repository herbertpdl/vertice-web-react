import { CirclePlay, Pencil } from "lucide-react";
import type { Exercise } from "@/lib/api/types";

/** Column widths shared by the catalog's header row and every `ExerciseRow`. */
export const EXERCISE_COLUMN_WIDTHS = { name: 260, description: 380, video: 90, edit: 60 };

interface ExerciseRowProps {
  exercise: Exercise;
  onEdit: (exercise: Exercise) => void;
}

/** One `/exercicios` row. A starter-set exercise is read-only (R28): no edit action, no marker. */
export function ExerciseRow({ exercise, onEdit }: ExerciseRowProps) {
  return (
    <div className="flex w-full items-center gap-[var(--space-4)] border-t border-[var(--color-border)] px-[var(--space-5)] py-[var(--space-4)]">
      <div style={{ width: EXERCISE_COLUMN_WIDTHS.name }} className="flex flex-col gap-[4px]">
        <span className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">
          {exercise.name}
        </span>
        <div className="flex flex-wrap gap-[4px]">
          {exercise.muscleGroups.map((group) => (
            <span
              key={group.id}
              className="w-fit rounded-[var(--radius-full)] bg-[var(--color-surface-hover)] px-[8px] py-[2px] text-[10px] font-semibold text-[color:var(--color-text-secondary)]"
            >
              {group.name}
            </span>
          ))}
        </div>
      </div>
      <p
        style={{ width: EXERCISE_COLUMN_WIDTHS.description }}
        className="text-[12px] leading-[1.4] text-[color:var(--color-text-secondary)]"
      >
        {exercise.description}
      </p>
      <div
        style={{ width: EXERCISE_COLUMN_WIDTHS.video }}
        className="flex items-center justify-center"
      >
        {exercise.videoUrl ? (
          <a
            href={exercise.videoUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Vídeo de ${exercise.name}`}
          >
            <CirclePlay width={16} height={16} className="text-[color:var(--color-primary)]" />
          </a>
        ) : (
          <span className="text-[12px] text-[color:var(--color-text-tertiary)]">—</span>
        )}
      </div>
      {exercise.isStarter ? (
        <span aria-hidden style={{ width: EXERCISE_COLUMN_WIDTHS.edit }} />
      ) : (
        <button
          type="button"
          onClick={() => onEdit(exercise)}
          aria-label="Editar exercício"
          style={{ width: EXERCISE_COLUMN_WIDTHS.edit }}
          className="flex items-center justify-center text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]"
        >
          <Pencil width={16} height={16} />
        </button>
      )}
    </div>
  );
}
