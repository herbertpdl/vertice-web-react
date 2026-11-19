import { ArrowUpRight } from "lucide-react";

interface PromoteExerciseButtonProps {
  /** The trainer's exercise, for the accessible name ("Promover Remada baixa ao catálogo"). */
  exerciseName: string;
  onClick: () => void;
  /** "Promover ao catálogo" in the catalog (`iiou2`), "Promover" in the dashboard's table (`En3Ju`). */
  label?: string;
  /** `outline` (the tables) or `link`, the phone list's plain "Promover" (`qzCk9`). */
  variant?: "outline" | "link";
}

/**
 * The small outline action that opens the promote dialog for a trainer's private exercise
 * (pen.dev "Promover Btn" in `iiou2` and `En3Ju`; PRD R26, R57).
 */
export function PromoteExerciseButton({
  exerciseName,
  onClick,
  label = "Promover ao catálogo",
  variant = "outline",
}: PromoteExerciseButtonProps) {
  if (variant === "link") {
    return (
      <button
        type="button"
        aria-label={`Promover ${exerciseName} ao catálogo`}
        onClick={onClick}
        className="font-base shrink-0 text-[12px] font-semibold text-[color:var(--color-primary)] hover:underline"
      >
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-label={`Promover ${exerciseName} ao catálogo`}
      onClick={onClick}
      className="font-base flex shrink-0 items-center gap-[6px] rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] px-[10px] py-[6px] text-[12px] leading-[1.25] font-semibold text-[color:var(--color-primary)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-hover)]"
    >
      <ArrowUpRight aria-hidden="true" width={14} height={14} />
      {label}
    </button>
  );
}
