"use client";

import { useState, type DragEvent } from "react";
import { Copy, GripVertical, Lock, MessageSquareText, X } from "lucide-react";
import { Dropdown } from "@/components/ui";
import { NOTES_MAX, REPS_MAX, REST_SECONDS_MAX } from "@/lib/validation/bounds";
import {
  setStrategyDescription,
  setStrategyLabels,
  type SetStrategyFormInput,
} from "@/lib/validation/exerciseSets";
import type { EditorSet, SetFields } from "@/lib/workoutEditor/model";

const strategyOptions = Object.entries(setStrategyLabels).map(([value, label]) => ({
  value,
  label,
}));

/** Column template shared by the header row and every set row (design: 14 / 24 / 150 / 110 / 90 / 80 / 90 + actions, gap 10). */
export const SET_GRID = "grid-cols-[14px_24px_150px_110px_90px_80px_90px_auto] gap-[10px]";

// What may be typed (anything else marks the cell invalid) vs. what is sent:
// a lone or trailing separator ("." / "6,") is a keystroke away from a number,
// so it is neither flagged nor committed — committing it would send a value
// the platform rejects and undo the whole pending batch (E9).
const DECIMAL = /^\d*([.,]\d*)?$/;
const COMPLETE_DECIMAL = /^(\d+([.,]\d+)?|[.,]\d+)$/;
const INTEGER = /^\d*$/;

/** What the platform stores (vertice-api): weight `NUMERIC(6,2)`, % `NUMERIC(5,2)`, reps/rest capped. */
type Bounds = { max: number } | { intDigits: number; decDigits: number };

/** Whether `text` (already matching DECIMAL / INTEGER) is within `bounds`; a dangling separator is. */
function withinBounds(text: string, bounds: Bounds): boolean {
  if ("max" in bounds) return text === "" || Number(text) <= bounds.max;
  const [int = "", dec = ""] = text.replace(",", ".").split(".");
  return int.replace(/^0+(?=\d)/, "").length <= bounds.intDigits && dec.length <= bounds.decDigits;
}

/** Wire form of a complete decimal: dot separator, leading zero. */
function toWireDecimal(text: string): string {
  const dotted = text.replace(",", ".");
  return dotted.startsWith(".") ? `0${dotted}` : dotted;
}

function Cell({
  value,
  onCommit,
  placeholder,
  kind,
  bounds,
  ariaLabel,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  kind: "integer" | "decimal";
  bounds: Bounds;
  ariaLabel: string;
}) {
  const [local, setLocal] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  // Re-sync when the draft changes underneath (e.g. a refused change restored it).
  if (value !== lastValue) {
    setLastValue(value);
    setLocal(value);
  }
  const pattern = kind === "integer" ? INTEGER : DECIMAL;
  const valid = pattern.test(local) && withinBounds(local, bounds);

  return (
    <input
      value={local}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={!valid}
      inputMode={kind === "integer" ? "numeric" : "decimal"}
      onChange={(event) => {
        const next = event.target.value;
        setLocal(next);
        // Out of range is flagged (above) and never committed, so it can't undo the pending batch.
        if (!pattern.test(next) || !withinBounds(next, bounds)) return;
        if (kind === "integer" || next === "") onCommit(next);
        else if (COMPLETE_DECIMAL.test(next)) onCommit(toWireDecimal(next));
      }}
      onBlur={() => {
        // Left on a dangling separator: show what was actually committed.
        if (!valid || (kind === "decimal" && local !== "" && !COMPLETE_DECIMAL.test(local))) {
          setLocal(value);
        }
      }}
      className={`w-full rounded-[var(--radius-sm)] border bg-[var(--color-bg)] px-[10px] py-[7px] text-[12px] text-[color:var(--color-text-primary)] outline-none transition-colors placeholder:text-[color:var(--color-text-tertiary)] focus:border-[var(--color-primary)] ${
        valid ? "border-[var(--color-border)]" : "border-[var(--color-danger)]"
      }`}
    />
  );
}

export interface SetRowProps {
  set: EditorSet;
  setNumber: number;
  onUpdate: (patch: Partial<SetFields>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  /** The exercise already has the maximum number of sets (R22). */
  duplicateDisabled?: boolean;
  /** This row is the one being dragged. */
  dragging?: boolean;
  /** A removal of this set was refused and undone (R27). */
  refused?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
}

export function SetRow({
  set,
  setNumber,
  onUpdate,
  onDuplicate,
  onRemove,
  duplicateDisabled,
  dragging,
  refused,
  onDragStart,
  onDragEnd,
}: SetRowProps) {
  // Only a drag that starts on the grip handle moves the row, so text
  // selection inside the cells keeps working.
  const [armed, setArmed] = useState(false);
  const notes = set.notes ?? "";
  // A set that already has a description opens with it showing.
  const [describing, setDescribing] = useState(notes !== "");
  const descriptionId = `set-${set.key}-description`;

  const shell = dragging
    ? "rounded-[var(--radius-md)] border border-[var(--color-primary)] bg-[var(--color-surface-hover)] px-[8px] py-[4px] shadow-[0_8px_24px_#00000080]"
    : refused
      ? "rounded-[var(--radius-sm)] border border-[var(--color-danger)] px-[6px] py-[3px]"
      : "";

  return (
    <div
      role="row"
      aria-label={`Série ${setNumber}`}
      draggable={armed}
      onDragStart={(event) => {
        if (!armed) {
          event.preventDefault();
          return;
        }
        onDragStart?.(event);
      }}
      onDragEnd={() => {
        setArmed(false);
        onDragEnd?.();
      }}
      className={`flex w-full flex-col gap-[var(--space-2)] ${shell}`}
    >
      <div className={`grid w-full items-center ${SET_GRID}`}>
        <button
          type="button"
          aria-label={`Arrastar série ${setNumber}`}
          onPointerDown={() => setArmed(true)}
          onPointerUp={() => setArmed(false)}
          className={`flex h-[14px] w-[14px] cursor-grab items-center justify-center ${
            dragging ? "text-[color:var(--color-primary)]" : "text-[color:var(--color-text-tertiary)]"
          }`}
        >
          <GripVertical width={14} height={14} />
        </button>
        <span className="text-[13px] font-semibold text-[color:var(--color-text-tertiary)]">
          {setNumber}
        </span>
        <Dropdown
          size="compact"
          options={strategyOptions}
          value={set.strategy}
          onChange={(value) => onUpdate({ strategy: value as SetStrategyFormInput })}
        />
        <Cell
          kind="integer"
          bounds={{ max: REPS_MAX }}
          ariaLabel={`Reps da série ${setNumber}`}
          value={set.reps !== undefined ? String(set.reps) : ""}
          placeholder="reps"
          onCommit={(v) => onUpdate({ reps: v === "" ? undefined : Number(v) })}
        />
        <Cell
          kind="decimal"
          bounds={{ intDigits: 4, decDigits: 2 }}
          ariaLabel={`Peso da série ${setNumber}`}
          value={set.weight ?? ""}
          placeholder="kg"
          onCommit={(v) => onUpdate({ weight: v === "" ? undefined : v })}
        />
        <Cell
          kind="decimal"
          bounds={{ intDigits: 3, decDigits: 2 }}
          ariaLabel={`%1RM da série ${setNumber}`}
          value={set.loadPercentage ?? ""}
          placeholder="%"
          onCommit={(v) => onUpdate({ loadPercentage: v === "" ? undefined : v })}
        />
        <Cell
          kind="integer"
          bounds={{ max: REST_SECONDS_MAX }}
          ariaLabel={`Descanso da série ${setNumber}`}
          value={set.restSeconds !== undefined ? String(set.restSeconds) : ""}
          placeholder="s"
          onCommit={(v) => onUpdate({ restSeconds: v === "" ? undefined : Number(v) })}
        />
        <div className="flex items-center gap-[6px] pl-[2px]">
          <button
            type="button"
            onClick={() => setDescribing((open) => !open)}
            aria-label={`Descrição da estratégia da série ${setNumber}`}
            aria-expanded={describing}
            aria-controls={describing ? descriptionId : undefined}
            className={`flex h-[18px] w-[18px] items-center justify-center hover:text-[color:var(--color-primary)] ${
              notes !== ""
                ? "text-[color:var(--color-primary)]"
                : describing
                  ? "text-[color:var(--color-text-secondary)]"
                  : "text-[color:var(--color-text-tertiary)]"
            }`}
          >
            <MessageSquareText width={15} height={15} />
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            disabled={duplicateDisabled}
            aria-label={`Duplicar série ${setNumber}`}
            className="flex h-[18px] w-[18px] items-center justify-center text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-primary)] disabled:opacity-35"
          >
            <Copy width={15} height={15} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remover série ${setNumber}`}
            className="flex h-[18px] w-[18px] items-center justify-center text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-danger)]"
          >
            <X width={15} height={15} />
          </button>
          {refused && (
            <span className="ml-[10px] flex items-center gap-[6px] rounded-[var(--radius-full)] bg-[#ff5c5c26] px-[10px] py-[3px] text-[11px] font-semibold whitespace-nowrap text-[color:var(--color-danger)]">
              <Lock width={11} height={11} />
              Remoção desfeita — desempenho registrado por um aluno
            </span>
          )}
        </div>
      </div>
      {describing && (
        <div className="ml-[58px] flex max-w-[690px] flex-col gap-[6px]">
          <label htmlFor={descriptionId} className="text-[12px] font-semibold text-[color:var(--color-text-secondary)]">
            Descrição da estratégia{" "}
            <span className="font-normal text-[color:var(--color-text-tertiary)]">(opcional)</span>
          </label>
          <textarea
            id={descriptionId}
            rows={2}
            value={notes}
            maxLength={NOTES_MAX}
            placeholder={`Padrão: ${setStrategyDescription(set.strategy, (set.durationSeconds ?? 0) > 0)}`}
            onChange={(event) => onUpdate({ notes: event.target.value === "" ? undefined : event.target.value })}
            className="resize-none rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-[10px] py-[8px] text-[13px] leading-[19px] text-[color:var(--color-text-primary)] outline-none placeholder:text-[color:var(--color-text-tertiary)] focus:border-[var(--color-primary)]"
          />
          <div className="flex justify-between gap-[var(--space-4)] text-[11px] text-[color:var(--color-text-tertiary)]">
            <span>
              {notes.trim() === ""
                ? `Vazio: o aluno vê a descrição padrão de ${setStrategyLabels[set.strategy]}.`
                : `O aluno vê esta descrição no lugar da padrão de ${setStrategyLabels[set.strategy]}.`}
            </span>
            <span aria-label={`${notes.length} de ${NOTES_MAX} caracteres`}>
              {notes.length}/{NOTES_MAX}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
