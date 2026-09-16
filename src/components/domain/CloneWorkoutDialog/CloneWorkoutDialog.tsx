"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, TextField } from "@/components/ui";
import { fetchRecentWorkouts, cloneWorkout } from "@/lib/api/workouts";
import { DAY_NAMES } from "@/lib/days";
import type { Workout } from "@/lib/api/types";

interface CloneWorkoutDialogProps {
  targetTrainingPlanId: number;
  onClose: () => void;
  onCloned: (workout: Workout) => void;
}

export function CloneWorkoutDialog({
  targetTrainingPlanId,
  onClose,
  onCloned,
}: CloneWorkoutDialogProps) {
  const [search, setSearch] = useState("");
  const { data } = useQuery({ queryKey: ["recentWorkouts"], queryFn: fetchRecentWorkouts });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.studentName.toLowerCase().includes(q) ||
        w.planName.toLowerCase().includes(q),
    );
  }, [data, search]);

  const cloneMutation = useMutation({
    mutationFn: (source: (typeof filtered)[number]) =>
      cloneWorkout(source.id, {
        targetTrainingPlanId,
        name: source.name,
        dayOfWeek: source.dayOfWeek,
      }),
    onSuccess: (workout) => onCloned(workout),
  });

  return (
    <Dialog title="Usar treino existente como base" onClose={onClose} width={560}>
      <div className="relative w-full">
        <Search
          width={15}
          height={15}
          className="pointer-events-none absolute top-1/2 left-[14px] -translate-y-1/2 text-[color:var(--color-text-tertiary)]"
        />
        <TextField
          placeholder="Buscar por treino, aluno ou plano..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="[&_input]:pl-[22px]"
        />
      </div>
      <div className="flex max-h-[360px] flex-col gap-[var(--space-2)] overflow-y-auto">
        {filtered.map((workout) => (
          <button
            key={workout.id}
            type="button"
            disabled={cloneMutation.isPending}
            onClick={() => cloneMutation.mutate(workout)}
            className="flex w-full items-center justify-between gap-[var(--space-3)] rounded-[var(--radius-md)] border border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-3)] text-left transition-colors hover:border-[var(--color-border-strong)]"
          >
            <div className="flex flex-col gap-[2px]">
              <span className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">
                {workout.name}
              </span>
              <span className="text-[11px] text-[color:var(--color-text-tertiary)]">
                {workout.studentName} · {workout.planName} · {DAY_NAMES[workout.dayOfWeek]}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[color:var(--color-text-secondary)]">
              {workout.exerciseCount} exercícios
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="py-[var(--space-4)] text-center text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
            Nenhum treino encontrado.
          </p>
        )}
      </div>
    </Dialog>
  );
}
