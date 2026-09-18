"use client";

import { useState, type DragEvent } from "react";
import { Copy, GripVertical, Lock, X } from "lucide-react";
import { Dropdown } from "@/components/ui";
import { setStrategyLabels, type SetStrategyFormInput } from "@/lib/validation/exerciseSets";
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
  ariaLabel,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  kind: "integer" | "decimal";
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
  const valid = pattern.test(local);

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
        if (!pattern.test(next)) return;
        if (kind === "integer" || next === "") onCommit(next);
        else if (COMPLETE_DECIMAL.test(next)) onCommit(toWireDecimal(next));
      }}
      onBlur={() => {
        // Left on a dangling separator: show what was actually committed.
        if (kind === "decimal" && local !== "" && !COMPLETE_DECIMAL.test(local)) setLocal(value);
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
      className={`grid w-full items-center ${SET_GRID} ${shell}`}
    >
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
        ariaLabel={`Reps da série ${setNumber}`}
        value={set.reps !== undefined ? String(set.reps) : ""}
        placeholder="reps"
        onCommit={(v) => onUpdate({ reps: v === "" ? undefined : Number(v) })}
      />
      <Cell
        kind="decimal"
        ariaLabel={`Peso da série ${setNumber}`}
        value={set.weight ?? ""}
        placeholder="kg"
        onCommit={(v) => onUpdate({ weight: v === "" ? undefined : v })}
      />
      <Cell
        kind="decimal"
        ariaLabel={`%1RM da série ${setNumber}`}
        value={set.loadPercentage ?? ""}
        placeholder="%"
        onCommit={(v) => onUpdate({ loadPercentage: v === "" ? undefined : v })}
      />
      <Cell
        kind="integer"
        ariaLabel={`Descanso da série ${setNumber}`}
        value={set.restSeconds !== undefined ? String(set.restSeconds) : ""}
        placeholder="s"
        onCommit={(v) => onUpdate({ restSeconds: v === "" ? undefined : Number(v) })}
      />
      <div className="flex items-center gap-[6px] pl-[2px]">
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
  );
}
