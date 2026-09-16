"use client";

import { useState, type DragEvent } from "react";
import { Ban, CircleAlert, CirclePlay, GripVertical, Info, Move, Trash2 } from "lucide-react";
import { Button, TextField } from "@/components/ui";
import { muscleGroupLabels } from "@/lib/validation/exercises";
import { MAX_SETS, type EditorExercise, type ExerciseFields, type SetFields } from "@/lib/workoutEditor/model";
import { SET_GRID, SetRow } from "../SetRow";

export type CardDragState = "idle" | "dragging" | "not-allowed";

export interface WorkoutExerciseCardProps {
  exercise: EditorExercise;
  /** 1-based position in the workout (R17). */
  position: number;
  onUpdate: (patch: Partial<ExerciseFields>) => void;
  onRemove: () => void;
  onAddSet: () => void;
  onDuplicateSet: (setKey: string) => void;
  onRemoveSet: (setKey: string) => void;
  onUpdateSet: (setKey: string, patch: Partial<SetFields>) => void;
  onMoveSet: (setKey: string, toIndex: number) => void;
  /** "dragging": this card is being dragged; "not-allowed": a set from another exercise is being dragged (E11). */
  dragState?: CardDragState;
  /** A removal of this exercise (or one of its sets) was refused and undone (R27). */
  refused?: boolean;
  refusedSetKeys?: readonly string[];
  /** Key of the set being dragged inside this card, if any. */
  draggingSetKey?: string | null;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
  onSetDragStart?: (setKey: string, event: DragEvent<HTMLDivElement>) => void;
  onSetDragEnd?: () => void;
}

const INTEGER = /^\d*$/;

function RestField({ value, onCommit }: { value: number; onCommit: (value: number) => void }) {
  const [local, setLocal] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setLocal(String(value));
  }
  return (
    <div className="flex h-[27px] w-[90px] items-center justify-end gap-[2px] rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-[10px] py-[6px] focus-within:border-[var(--color-primary)]">
      <input
        value={local}
        aria-label="Descanso entre séries (segundos)"
        inputMode="numeric"
        onChange={(event) => {
          const next = event.target.value;
          if (!INTEGER.test(next)) return;
          setLocal(next);
          if (next !== "") onCommit(Number(next));
        }}
        onBlur={() => {
          if (local === "") {
            setLocal("0");
            onCommit(0);
          }
        }}
        className="w-full bg-transparent text-right text-[12px] text-[color:var(--color-text-primary)] outline-none"
      />
      <span className="text-[12px] text-[color:var(--color-text-primary)]">s</span>
    </div>
  );
}

function DropIndicator() {
  return (
    <div aria-hidden className="flex h-[8px] w-full items-center gap-[8px]">
      <span className="h-[8px] w-[8px] rounded-full bg-[var(--color-primary)]" />
      <span className="h-[2px] flex-1 bg-[var(--color-primary)]" />
    </div>
  );
}

export function WorkoutExerciseCard({
  exercise,
  position,
  onUpdate,
  onRemove,
  onAddSet,
  onDuplicateSet,
  onRemoveSet,
  onUpdateSet,
  onMoveSet,
  dragState = "idle",
  refused,
  refusedSetKeys,
  draggingSetKey,
  onDragStart,
  onDragEnd,
  onSetDragStart,
  onSetDragEnd,
}: WorkoutExerciseCardProps) {
  const [armed, setArmed] = useState(false);
  // Insertion index for the set being dragged inside this card.
  const [setOverIndex, setSetOverIndex] = useState<number | null>(null);
  const atSetCap = exercise.sets.length >= MAX_SETS;
  const draggingOwnSet = draggingSetKey != null;
  const notAllowed = dragState === "not-allowed";

  const shell =
    dragState === "dragging"
      ? "border-[var(--color-primary)] bg-[var(--color-surface-hover)] shadow-[0_12px_32px_#00000080]"
      : refused
        ? "border-[var(--color-danger)] bg-[var(--color-surface)]"
        : "border-[var(--color-border)] bg-[var(--color-surface)]";

  function handleRowDragOver(event: DragEvent<HTMLDivElement>, index: number) {
    if (!draggingOwnSet) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    setSetOverIndex(before ? index : index + 1);
  }

  function handleSetsDrop(event: DragEvent<HTMLDivElement>) {
    if (!draggingOwnSet || draggingSetKey == null) return;
    event.preventDefault();
    if (setOverIndex !== null) onMoveSet(draggingSetKey, setOverIndex);
    setSetOverIndex(null);
  }

  return (
    <div
      role="group"
      aria-label={`Exercício ${position}: ${exercise.exercise.name}`}
      draggable={armed}
      onDragStart={(event) => {
        // Drags of nested set rows bubble up here; leave them alone.
        if (event.target !== event.currentTarget) return;
        if (!armed) {
          event.preventDefault();
          return;
        }
        onDragStart?.(event);
      }}
      onDragEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        setArmed(false);
        onDragEnd?.();
      }}
      className={`flex w-full flex-col gap-[var(--space-4)] rounded-[var(--radius-lg)] border p-[var(--space-5)] transition-colors ${shell} ${
        notAllowed ? "opacity-60" : ""
      }`}
    >
      {notAllowed && (
        <span className="flex w-fit items-center gap-[6px] rounded-[var(--radius-full)] bg-[var(--color-surface-hover)] px-[10px] py-[3px] text-[11px] font-semibold text-[color:var(--color-text-secondary)]">
          <Ban width={12} height={12} />
          Não é possível soltar uma série de outro exercício aqui
        </span>
      )}

      <div className="flex w-full items-start justify-between gap-[var(--space-4)]">
        <div className="flex items-center gap-[var(--space-3)]">
          <button
            type="button"
            aria-label={`Arrastar exercício ${position}`}
            onPointerDown={() => setArmed(true)}
            onPointerUp={() => setArmed(false)}
            className={`flex h-[18px] w-[18px] cursor-grab items-center justify-center ${
              dragState === "dragging"
                ? "text-[color:var(--color-primary)]"
                : "text-[color:var(--color-text-tertiary)]"
            }`}
          >
            <GripVertical width={18} height={18} />
          </button>
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface-hover)] text-[12px] font-bold text-[color:var(--color-primary)]">
            {position}
          </span>
          <div className="flex flex-col gap-[2px]">
            <div className="flex items-center gap-[8px]">
              <span className="font-heading text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
                {exercise.exercise.name}
              </span>
              {dragState === "dragging" && (
                <span className="flex items-center gap-[6px] rounded-[var(--radius-full)] bg-[#00e5ff26] px-[10px] py-[3px] text-[11px] font-semibold text-[color:var(--color-primary)]">
                  <Move width={12} height={12} />
                  Arrastando
                </span>
              )}
            </div>
            <div className="flex items-center gap-[8px]">
              <span className="rounded-[var(--radius-full)] bg-[var(--color-surface-hover)] px-[8px] py-[3px] text-[11px] font-semibold text-[color:var(--color-text-secondary)]">
                {muscleGroupLabels[exercise.exercise.muscleGroup]}
              </span>
              {exercise.exercise.videoUrl && (
                <a
                  href={exercise.exercise.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-[4px] text-[12px] text-[color:var(--color-primary)] hover:opacity-80"
                >
                  <CirclePlay width={13} height={13} />
                  Ver vídeo
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-[var(--space-4)]">
          <div className="flex flex-col items-end gap-[2px]">
            <span className="text-[10px] text-[color:var(--color-text-tertiary)]">
              Descanso entre séries
            </span>
            <RestField
              value={exercise.restSecondsBetweenSets}
              onCommit={(restSecondsBetweenSets) => onUpdate({ restSecondsBetweenSets })}
            />
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remover exercício ${exercise.exercise.name}`}
            className="mt-[12px] flex h-[17px] w-[17px] items-center justify-center text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-danger)]"
          >
            <Trash2 width={17} height={17} />
          </button>
        </div>
      </div>

      <TextField
        label="Notas"
        placeholder="Adicione observações para este exercício..."
        value={exercise.notes}
        onChange={(event) => onUpdate({ notes: event.target.value })}
        className="[&>div]:bg-[var(--color-bg)]"
      />

      {exercise.sets.length === 0 ? (
        <div className="flex w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-[var(--space-4)] text-[12px] text-[color:var(--color-text-tertiary)]">
          Nenhuma série ainda — este exercício será salvo sem séries
        </div>
      ) : (
        <div
          role="table"
          aria-label="Séries"
          className="flex w-full flex-col gap-[var(--space-2)]"
          onDragOver={(event) => {
            if (draggingOwnSet) event.preventDefault();
          }}
          onDrop={handleSetsDrop}
        >
          <div className={`grid w-full items-center ${SET_GRID}`}>
            <span />
            <span className="text-[11px] font-semibold text-[color:var(--color-text-tertiary)]">#</span>
            {["ESTRATÉGIA", "REPS/DURAÇÃO", "PESO", "%1RM", "DESCANSO"].map((h) => (
              <span
                key={h}
                className="text-[10px] font-semibold tracking-[0.6px] text-[color:var(--color-text-tertiary)]"
              >
                {h}
              </span>
            ))}
            <span />
          </div>
          {exercise.sets.map((set, index) => (
            <div key={set.key} className="contents">
              {draggingOwnSet && setOverIndex === index && <DropIndicator />}
              <div onDragOver={(event) => handleRowDragOver(event, index)}>
                <SetRow
                  set={set}
                  setNumber={index + 1}
                  dragging={draggingSetKey === set.key}
                  refused={refusedSetKeys?.includes(set.key)}
                  duplicateDisabled={atSetCap}
                  onUpdate={(patch) => onUpdateSet(set.key, patch)}
                  onDuplicate={() => onDuplicateSet(set.key)}
                  onRemove={() => onRemoveSet(set.key)}
                  onDragStart={(event) => onSetDragStart?.(set.key, event)}
                  onDragEnd={() => {
                    setSetOverIndex(null);
                    onSetDragEnd?.();
                  }}
                />
              </div>
            </div>
          ))}
          {draggingOwnSet && setOverIndex === exercise.sets.length && <DropIndicator />}
        </div>
      )}

      {draggingOwnSet && (
        <p className="flex items-center gap-[6px] text-[12px] text-[color:var(--color-text-tertiary)]">
          <Info width={13} height={13} />
          Arraste para reordenar. Séries só podem ser reordenadas dentro do próprio exercício —
          soltar em outro exercício devolve a série ao lugar de origem.
        </p>
      )}

      <div className="flex items-center gap-[12px]">
        <Button variant="outline" size="sm" onClick={onAddSet} disabled={atSetCap}>
          + Adicionar série
        </Button>
        {atSetCap && (
          <span className="flex items-center gap-[6px] text-[12px] text-[color:var(--color-warning)]">
            <CircleAlert width={13} height={13} />
            Limite de {MAX_SETS} séries por exercício atingido. Remova uma série para adicionar outra.
          </span>
        )}
      </div>
    </div>
  );
}
