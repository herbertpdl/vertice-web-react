"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Dropdown } from "@/components/ui";
import { setStrategyLabels, type SetStrategyFormInput } from "@/lib/validation/exerciseSets";
import type { ExerciseSet } from "@/lib/api/types";
import type { ExerciseSetInput } from "@/lib/api/exerciseSets";

const strategyOptions = Object.entries(setStrategyLabels).map(([value, label]) => ({
  value,
  label,
}));

function Cell({
  value,
  onCommit,
  placeholder,
  numeric,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  numeric?: boolean;
}) {
  const [local, setLocal] = useState(value);
  return (
    <input
      value={local}
      placeholder={placeholder}
      inputMode={numeric ? "decimal" : "text"}
      onChange={(event) => setLocal(event.target.value)}
      onBlur={() => {
        if (local !== value) onCommit(local);
      }}
      className="w-full rounded-[var(--radius-sm)] border border-transparent bg-transparent px-[8px] py-[6px] text-[13px] text-[color:var(--color-text-primary)] outline-none transition-colors hover:border-[var(--color-border)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)]"
    />
  );
}

interface SetRowProps {
  set: ExerciseSet;
  onUpdate: (patch: Partial<ExerciseSetInput>) => void;
  onDelete: () => void;
}

export function SetRow({ set, onUpdate, onDelete }: SetRowProps) {
  return (
    <div className="grid w-full grid-cols-[32px_140px_1fr_1fr_1fr_1fr_28px] items-center gap-[var(--space-2)] border-t border-[var(--color-border)] py-[2px]">
      <span className="text-[12px] font-semibold text-[color:var(--color-text-tertiary)]">
        {set.setNumber}
      </span>
      <Dropdown
        options={strategyOptions}
        value={set.strategy}
        onChange={(value) => onUpdate({ strategy: value as SetStrategyFormInput })}
      />
      <Cell
        value={set.reps !== undefined ? String(set.reps) : ""}
        placeholder="reps"
        numeric
        onCommit={(v) => onUpdate({ reps: v === "" ? undefined : Number(v) })}
      />
      <Cell
        value={set.weight ?? ""}
        placeholder="kg"
        numeric
        onCommit={(v) => onUpdate({ weight: v === "" ? undefined : v })}
      />
      <Cell
        value={set.loadPercentage ?? ""}
        placeholder="%1RM"
        numeric
        onCommit={(v) => onUpdate({ loadPercentage: v === "" ? undefined : v })}
      />
      <Cell
        value={set.restSeconds !== undefined ? String(set.restSeconds) : ""}
        placeholder="seg"
        numeric
        onCommit={(v) => onUpdate({ restSeconds: v === "" ? undefined : Number(v) })}
      />
      <button
        type="button"
        onClick={onDelete}
        aria-label="Remover série"
        className="flex h-6 w-6 items-center justify-center text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-danger)]"
      >
        <Trash2 width={14} height={14} />
      </button>
    </div>
  );
}
