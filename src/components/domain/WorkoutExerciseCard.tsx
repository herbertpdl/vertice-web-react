"use client";

import { useRef, useState } from "react";
import { CirclePlay, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { updateWorkoutExercise, deleteWorkoutExercise } from "@/lib/api/workoutExercises";
import { createExerciseSet, updateExerciseSet, deleteExerciseSet } from "@/lib/api/exerciseSets";
import type { ExerciseSetInput } from "@/lib/api/exerciseSets";
import { muscleGroupLabels } from "@/lib/validation/exercises";
import { SetRow } from "./SetRow";
import type { FullWorkoutExercise } from "@/lib/api/types";

export function WorkoutExerciseCard({
  workoutExercise,
  onChanged,
}: {
  workoutExercise: FullWorkoutExercise;
  onChanged: () => void;
}) {
  const [notes, setNotes] = useState(workoutExercise.notes);
  const [rest, setRest] = useState(String(workoutExercise.restSecondsBetweenSets));

  // Accumulates in-flight edits per set id. The BFF's PATCH validates the
  // full set shape (not a partial), so every edit resends the whole row -
  // without this, two fields edited back-to-back (before the first PATCH's
  // refetch lands) would each build off the same stale server snapshot and
  // the second write would clobber the first.
  const setOverrides = useRef<Record<number, Partial<ExerciseSetInput>>>({});

  const invalidate = () => onChanged();

  const updateMutation = useMutation({
    // Base the unedited field on local state (not the workoutExercise prop),
    // which can still be a stale pre-refetch snapshot if the other field was
    // just edited a moment before.
    mutationFn: (patch: { notes?: string; restSecondsBetweenSets?: number }) =>
      updateWorkoutExercise(workoutExercise.id, {
        order: workoutExercise.order,
        notes: patch.notes ?? notes,
        restSecondsBetweenSets: patch.restSecondsBetweenSets ?? Number(rest),
      }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteWorkoutExercise(workoutExercise.id),
    onSuccess: invalidate,
  });

  const addSetMutation = useMutation({
    mutationFn: (input: ExerciseSetInput) => createExerciseSet(workoutExercise.id, input),
    onSuccess: invalidate,
  });

  const updateSetMutation = useMutation({
    // The BFF's PATCH /exercise-sets/:id validates the body against the same
    // schema as POST (setNumber/strategy required, not a partial), so every
    // update must resend the full current set merged with the changed field.
    mutationFn: ({ id, input }: { id: number; input: ExerciseSetInput }) =>
      updateExerciseSet(id, input),
    onSuccess: invalidate,
  });

  const deleteSetMutation = useMutation({
    mutationFn: (id: number) => deleteExerciseSet(id),
    onSuccess: invalidate,
  });

  return (
    <div className="flex w-full flex-col gap-[var(--space-4)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-5)]">
      <div className="flex w-full items-start justify-between gap-[var(--space-4)]">
        <div className="flex flex-col gap-[4px]">
          <div className="flex items-center gap-[var(--space-3)]">
            <span className="text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
              {workoutExercise.exercise.name}
            </span>
            <span className="rounded-[var(--radius-full)] bg-[var(--color-surface-hover)] px-[8px] py-[2px] text-[10px] font-semibold text-[color:var(--color-text-secondary)]">
              {muscleGroupLabels[workoutExercise.exercise.muscleGroup]}
            </span>
            {workoutExercise.exercise.videoUrl && (
              <a
                href={workoutExercise.exercise.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[12px] font-semibold text-[color:var(--color-primary)]"
              >
                <CirclePlay width={13} height={13} />
                Ver vídeo
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[color:var(--color-text-tertiary)]">
              Descanso entre séries
            </span>
            <input
              value={rest}
              onChange={(event) => setRest(event.target.value)}
              onBlur={() => {
                const n = Number(rest);
                if (!Number.isNaN(n) && n !== workoutExercise.restSecondsBetweenSets) {
                  updateMutation.mutate({ restSecondsBetweenSets: n });
                }
              }}
              inputMode="numeric"
              className="w-[48px] rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-transparent px-[6px] py-[2px] text-[12px] text-[color:var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
            />
            <span className="text-[12px] text-[color:var(--color-text-tertiary)]">s</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => deleteMutation.mutate()}
          aria-label="Remover exercício"
          className="flex h-7 w-7 items-center justify-center text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-danger)]"
        >
          <Trash2 width={15} height={15} />
        </button>
      </div>

      <input
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        onBlur={() => {
          if (notes !== workoutExercise.notes) updateMutation.mutate({ notes });
        }}
        placeholder="Notas (opcional)"
        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-[12px] py-[8px] text-[13px] text-[color:var(--color-text-primary)] outline-none placeholder:text-[color:var(--color-text-tertiary)] focus:border-[var(--color-primary)]"
      />

      <div className="flex w-full flex-col">
        <div className="grid w-full grid-cols-[32px_140px_1fr_1fr_1fr_1fr_28px] gap-[var(--space-2)] pb-1">
          {["#", "ESTRATÉGIA", "REPS/DURAÇÃO", "PESO", "%1RM", "DESCANSO", ""].map((h) => (
            <span
              key={h}
              className="text-[10px] font-semibold tracking-[0.6px] text-[color:var(--color-text-tertiary)]"
            >
              {h}
            </span>
          ))}
        </div>
        {workoutExercise.sets.map((set) => (
          <SetRow
            key={set.id}
            set={set}
            onUpdate={(patch) => {
              const merged: ExerciseSetInput = {
                setNumber: set.setNumber,
                reps: set.reps,
                durationSeconds: set.durationSeconds,
                weight: set.weight,
                loadPercentage: set.loadPercentage,
                strategy: set.strategy,
                restSeconds: set.restSeconds,
                notes: set.notes,
                ...setOverrides.current[set.id],
                ...patch,
              };
              setOverrides.current[set.id] = merged;
              updateSetMutation.mutate({ id: set.id, input: merged });
            }}
            onDelete={() => deleteSetMutation.mutate(set.id)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          addSetMutation.mutate({
            setNumber: workoutExercise.sets.length + 1,
            strategy: "STRAIGHT",
          })
        }
        disabled={addSetMutation.isPending}
        className="w-fit text-[12px] font-semibold text-[color:var(--color-primary)] hover:opacity-80"
      >
        + Adicionar série
      </button>
    </div>
  );
}
