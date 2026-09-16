"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, TextField } from "@/components/ui";
import { fetchRecentWorkouts, fetchFullWorkout } from "@/lib/api/workouts";
import { DAY_NAMES } from "@/lib/days";
import type { FullWorkout } from "@/lib/api/types";

interface CloneWorkoutDialogProps {
  onClose: () => void;
  /**
   * "Usar treino existente como base" seeds the editor with the chosen
   * workout's name, weekday, exercises and sets (R25); it never creates a
   * separate copy, so the source's full tree is fetched and handed over.
   */
  onPick: (source: FullWorkout) => void;
}

export function CloneWorkoutDialog({ onClose, onPick }: CloneWorkoutDialogProps) {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
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

  // Same key the editor uses for that workout, so a fresh copy is reused
  // (and Storybook can seed it) instead of always going to the BFF.
  const pickMutation = useMutation({
    mutationFn: (sourceId: number) =>
      queryClient.fetchQuery({
        queryKey: ["workout", sourceId, "full"],
        queryFn: () => fetchFullWorkout(sourceId),
      }),
    onSuccess: (source) => {
      onPick(source);
      onClose();
    },
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
            disabled={pickMutation.isPending}
            aria-busy={pickMutation.isPending && pickMutation.variables === workout.id}
            onClick={() => pickMutation.mutate(workout.id)}
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
        {pickMutation.isError && (
          <p className="text-[12px] text-[color:var(--color-danger)]">
            Não foi possível carregar o treino escolhido. Tente novamente.
          </p>
        )}
      </div>
    </Dialog>
  );
}
