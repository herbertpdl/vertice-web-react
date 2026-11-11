import type { Refusal } from "./autosave";
import type { EditorExercise } from "./model";

/**
 * Which exercise cards are collapsed in the editor (collapsible-exercise-card PRD). Pure view
 * state: it never enters the draft, so it is never saved and never touches the footer (R15).
 * Keyed by the exercise's stable `key`, not its position, so a reorder keeps each card's state
 * (R17), and a key not in the set is expanded — which is how a new or cloned exercise starts
 * expanded (R7, R9, R10) without any bookkeeping.
 */
export type CollapsedKeys = ReadonlySet<string>;

/** "1 série" / "N séries" / "Nenhuma série", with no mention of the set cap (R3). */
export function setCountLabel(count: number): string {
  if (count === 0) return "Nenhuma série";
  return count === 1 ? "1 série" : `${count} séries`;
}

export function toggleCollapsed(collapsed: CollapsedKeys, key: string): Set<string> {
  const next = new Set(collapsed);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

/** True when every card is collapsed, i.e. the editor-wide action reads "Expandir todos" (R13, R14). */
export function allCollapsed(exercises: readonly EditorExercise[], collapsed: CollapsedKeys): boolean {
  return exercises.length > 0 && exercises.every((we) => collapsed.has(we.key));
}

/** "Recolher todos" collapses every card; "Expandir todos" expands every card (R13, R14). */
export function toggleAll(exercises: readonly EditorExercise[], collapsed: CollapsedKeys): Set<string> {
  return allCollapsed(exercises, collapsed) ? new Set() : new Set(exercises.map((we) => we.key));
}

/**
 * A refused removal brings an exercise or a set back; the card it belongs to must be expanded
 * so the restored item and its flag are visible (R11, E3, E4). Returns `collapsed` itself when
 * nothing changes, so a caller can skip the state update.
 */
export function expandRefused(
  exercises: readonly EditorExercise[],
  collapsed: CollapsedKeys,
  refusal: Pick<Refusal, "exerciseKeys" | "setKeys">,
): CollapsedKeys {
  const affected = exercises
    .filter(
      (we) =>
        refusal.exerciseKeys.includes(we.key) ||
        we.sets.some((set) => refusal.setKeys.includes(set.key)),
    )
    .map((we) => we.key)
    .filter((key) => collapsed.has(key));
  if (affected.length === 0) return collapsed;
  const next = new Set(collapsed);
  for (const key of affected) next.delete(key);
  return next;
}
