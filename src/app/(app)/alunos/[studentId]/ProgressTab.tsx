"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dropdown } from "@/components/ui";
import { fetchExercises, fetchExerciseProgress } from "@/lib/api/exercises";
import { formatDateShort } from "@/lib/format";

export function ProgressTab({ clientId }: { clientId: number }) {
  const { data: exercises } = useQuery({
    queryKey: ["exercises"],
    queryFn: fetchExercises,
  });
  const [exerciseId, setExerciseId] = useState<string>("");

  const { data: progress, isPending } = useQuery({
    queryKey: ["exerciseProgress", exerciseId, clientId],
    queryFn: () => fetchExerciseProgress(Number(exerciseId), clientId),
    enabled: exerciseId !== "",
  });

  const points = (progress ?? []).map((p) => ({ ...p, weightNum: Number(p.weight) }));
  const max = Math.max(1, ...points.map((p) => p.weightNum));

  return (
    <div className="flex w-full flex-col gap-[var(--space-5)]">
      <div className="w-[320px]">
        <Dropdown
          label="Exercício"
          placeholder="Selecione um exercício"
          options={(exercises ?? []).map((ex) => ({ value: String(ex.id), label: ex.name }))}
          value={exerciseId}
          onChange={setExerciseId}
        />
      </div>

      {exerciseId === "" ? (
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
                {point.weightNum}kg
              </span>
              <div
                style={{ height: Math.max(4, (point.weightNum / max) * 140) }}
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
