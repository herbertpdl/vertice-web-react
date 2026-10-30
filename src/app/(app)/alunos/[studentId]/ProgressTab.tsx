"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dropdown } from "@/components/ui";
import { fetchExerciseProgress, fetchProgressExercises, progressExercisesQueryKey } from "@/lib/api/exercises";
import { formatDateShort } from "@/lib/format";

export function ProgressTab({ clientId }: { clientId: number }) {
  // Only the exercises this student has recorded loads for, most recent first (spec:
  // progress-exercise-picker): never the catalog, most of which would chart nothing.
  const exercises = useQuery({
    queryKey: progressExercisesQueryKey(clientId),
    queryFn: () => fetchProgressExercises(clientId),
  });
  const [exerciseId, setExerciseId] = useState<string>("");

  const { data: progress, isPending } = useQuery({
    queryKey: ["exerciseProgress", exerciseId, clientId],
    queryFn: () => fetchExerciseProgress(Number(exerciseId), clientId),
    enabled: exerciseId !== "",
  });

  // `weight` is a number on this endpoint (the only decimal in the contract that is not a
  // string): the BFF parses it before sending. See `ExerciseProgressPoint`.
  const points = progress ?? [];
  const max = Math.max(1, ...points.map((p) => p.weight));

  return (
    <div className="flex w-full flex-col gap-[var(--space-5)]">
      <div className="w-[320px]">
        <Dropdown
          label="Exercício"
          placeholder={exercises.isPending ? "Carregando exercícios..." : "Selecione um exercício"}
          options={(exercises.data ?? []).map((ex) => ({ value: String(ex.id), label: ex.name }))}
          value={exerciseId}
          onChange={setExerciseId}
          disabled={!exercises.data?.length}
        />
      </div>

      {/* Only before anything loaded: a failed background refetch keeps the options and chart. */}
      {exercises.data === undefined && exercises.isError ? (
        <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
          Não foi possível carregar os exercícios{" "}
          <button
            type="button"
            onClick={() => exercises.refetch()}
            className="font-semibold text-[color:var(--color-primary)]"
          >
            Tentar novamente
          </button>
        </p>
      ) : exercises.data?.length === 0 ? (
        <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
          Nenhuma carga registrada ainda. A evolução aparece quando o aluno concluir um treino
          registrando a carga.
        </p>
      ) : exerciseId === "" ? (
        <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
          Selecione um exercício para ver a evolução de carga do aluno.
        </p>
      ) : isPending ? (
        <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">Carregando...</p>
      ) : points.length === 0 ? (
        <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
          Nenhum registro de carga para este exercício ainda.
        </p>
      ) : (
        <div className="flex w-full items-end gap-[var(--space-3)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-6)]">
          {points.map((point) => (
            <div key={point.weekStartDate} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[11px] font-semibold text-[color:var(--color-text-primary)]">
                {point.weight}kg
              </span>
              <div
                style={{ height: Math.max(4, (point.weight / max) * 140) }}
                className="w-full rounded-t-[var(--radius-sm)] bg-[var(--color-primary)]"
              />
              <span className="text-[10px] text-[color:var(--color-text-tertiary)]">
                {formatDateShort(point.weekStartDate)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
