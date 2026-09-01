"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Dropdown, PageLoadingOverlay, TextField } from "@/components/ui";
import { AddExerciseDialog } from "./AddExerciseDialog";
import { CloneWorkoutDialog } from "./CloneWorkoutDialog";
import { WorkoutExerciseCard } from "./WorkoutExerciseCard";
import { fetchFullWorkout, createWorkout, updateWorkout } from "@/lib/api/workouts";
import { fetchTrainingPlan } from "@/lib/api/trainingPlans";
import { fetchStudent } from "@/lib/api/students";
import { DAY_ORDER, DAY_NAMES } from "@/lib/days";
import { useRedirectOnError } from "@/lib/hooks/useRedirectOnError";
import type { DayOfWeek } from "@/lib/api/types";

const dayOptions = DAY_ORDER.map((day) => ({ value: day, label: DAY_NAMES[day] }));

export function WorkoutEditor({
  planId,
  workoutId,
  initialDayOfWeek,
}: {
  planId: number;
  workoutId?: number;
  initialDayOfWeek?: DayOfWeek;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isNew = !workoutId;

  const [name, setName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(initialDayOfWeek ?? "MONDAY");
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data: plan } = useQuery({
    queryKey: ["trainingPlan", planId],
    queryFn: () => fetchTrainingPlan(planId),
  });
  const { data: student } = useQuery({
    queryKey: ["student", plan?.clientId],
    queryFn: () => fetchStudent(plan!.clientId),
    enabled: Boolean(plan),
  });

  const { data: full, isPending: workoutPending, error: workoutError } = useQuery({
    queryKey: ["workout", workoutId, "full"],
    queryFn: () => fetchFullWorkout(workoutId!),
    enabled: !isNew,
  });
  useRedirectOnError(workoutError, `/planos/${planId}`);

  if (full && !initialized) {
    setName(full.name);
    setDayOfWeek(full.dayOfWeek);
    setInitialized(true);
  }

  const invalidateWorkout = () => {
    queryClient.invalidateQueries({ queryKey: ["workout", workoutId, "full"] });
    queryClient.invalidateQueries({ queryKey: ["trainingPlan", planId] });
  };

  const createMutation = useMutation({
    mutationFn: () => createWorkout(planId, { name, dayOfWeek }),
    onSuccess: (workout) => {
      queryClient.invalidateQueries({ queryKey: ["trainingPlan", planId] });
      router.replace(`/planos/${planId}/treinos/${workout.id}`);
    },
  });

  const updateShellMutation = useMutation({
    mutationFn: (patch: { name?: string; dayOfWeek?: DayOfWeek }) =>
      updateWorkout(workoutId!, {
        name: patch.name ?? name,
        dayOfWeek: patch.dayOfWeek ?? dayOfWeek,
      }),
    onSuccess: invalidateWorkout,
  });

  const nextOrder = (full?.exercises.length ?? 0) + 1;

  return (
    <div className="relative flex w-full flex-col gap-[var(--space-6)] px-[var(--space-8)] py-[var(--space-8)]">
      <div className="flex items-center gap-2">
        <Link
          href={`/alunos/${plan?.clientId ?? ""}`}
          className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-primary)]"
        >
          {student?.name ?? "..."}
        </Link>
        <ChevronRight width={13} height={13} className="text-[color:var(--color-text-tertiary)]" />
        <Link
          href={`/planos/${planId}`}
          className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-primary)]"
        >
          {plan?.name ?? "..."}
        </Link>
        <ChevronRight width={13} height={13} className="text-[color:var(--color-text-tertiary)]" />
        <span className="text-[length:var(--text-sm)] font-semibold text-[color:var(--color-text-primary)]">
          {isNew ? "Novo treino" : (full?.name ?? "...")}
        </span>
      </div>

      <div className="flex w-full items-end justify-between gap-[var(--space-4)]">
        <div className="flex items-end gap-[var(--space-3)]">
          <TextField
            label="Nome do treino"
            placeholder="Treino A — Superior"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => {
              if (!isNew && name !== full?.name && name.trim() !== "") {
                updateShellMutation.mutate({ name });
              }
            }}
            className="w-[280px]"
          />
          <Dropdown
            label="Dia da semana"
            options={dayOptions}
            value={dayOfWeek}
            onChange={(value) => {
              const day = value as DayOfWeek;
              setDayOfWeek(day);
              if (!isNew) updateShellMutation.mutate({ dayOfWeek: day });
            }}
          />
        </div>
        {isNew ? (
          <Button variant="outline" onClick={() => setCloneOpen(true)}>
            Usar treino existente como base
          </Button>
        ) : (
          <Button onClick={() => setAddExerciseOpen(true)}>Adicionar exercício</Button>
        )}
      </div>

      {isNew ? (
        <div className="flex w-full flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-6)] py-[var(--space-16)] text-center">
          <p className="text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
            Este treino ainda não tem exercícios
          </p>
          <p className="max-w-[420px] text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
            Dê um nome ao treino e salve para começar a adicionar exercícios, ou use um treino
            existente como ponto de partida.
          </p>
          <Button
            loading={createMutation.isPending}
            disabled={name.trim() === ""}
            onClick={() => createMutation.mutate()}
          >
            Criar treino
          </Button>
        </div>
      ) : workoutPending || !full ? (
        <PageLoadingOverlay />
      ) : full.exercises.length === 0 ? (
        <div className="flex w-full flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-6)] py-[var(--space-16)] text-center">
          <p className="text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
            Este treino ainda não tem exercícios
          </p>
          <p className="max-w-[420px] text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
            Comece adicionando exercícios um a um, ou use um treino existente como ponto de
            partida.
          </p>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-[var(--space-4)]">
          {full.exercises.map((we) => (
            <WorkoutExerciseCard key={we.id} workoutExercise={we} onChanged={invalidateWorkout} />
          ))}
        </div>
      )}

      <div className="flex w-full items-center justify-between border-t border-[var(--color-border)] pt-[var(--space-5)]">
        <span className="text-[12px] text-[color:var(--color-text-tertiary)]">
          {isNew ? "Alterações salvas automaticamente após criar o treino" : "Alterações salvas automaticamente"}
        </span>
        <div className="flex items-center gap-[var(--space-3)]">
          <Button variant="ghost" onClick={() => router.push(`/planos/${planId}`)}>
            Descartar
          </Button>
          <Button onClick={() => router.push(`/planos/${planId}`)} disabled={isNew}>
            Concluir
          </Button>
        </div>
      </div>

      {!isNew && addExerciseOpen && (
        <AddExerciseDialog
          workoutId={workoutId!}
          nextOrder={nextOrder}
          onClose={() => setAddExerciseOpen(false)}
          onAdded={invalidateWorkout}
        />
      )}
      {isNew && cloneOpen && (
        <CloneWorkoutDialog
          targetTrainingPlanId={planId}
          onClose={() => setCloneOpen(false)}
          onCloned={(workout) => {
            queryClient.invalidateQueries({ queryKey: ["trainingPlan", planId] });
            router.replace(`/planos/${planId}/treinos/${workout.id}`);
          }}
        />
      )}
    </div>
  );
}
