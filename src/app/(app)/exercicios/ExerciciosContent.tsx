"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Button, Dropdown, TableRowSkeleton, TextField } from "@/components/ui";
import { ExerciseDialog } from "@/components/domain/ExerciseDialog";
import { EXERCISE_COLUMN_WIDTHS, ExerciseRow } from "@/components/domain/ExerciseRow";
import { exercisesQueryKey, fetchExercises } from "@/lib/api/exercises";
import { fetchMuscleGroups, muscleGroupsQueryKey } from "@/lib/api/muscleGroups";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { Exercise } from "@/lib/api/types";

const HEADERS = [
  { label: "EXERCÍCIO", width: EXERCISE_COLUMN_WIDTHS.name },
  { label: "DESCRIÇÃO", width: EXERCISE_COLUMN_WIDTHS.description },
  { label: "VÍDEO", width: EXERCISE_COLUMN_WIDTHS.video },
  { label: "", width: EXERCISE_COLUMN_WIDTHS.edit },
];

function subtitle(count: number, filtered: boolean) {
  if (filtered) return count === 1 ? "1 exercício encontrado" : `${count} exercícios encontrados`;
  return count === 1 ? "1 exercício no catálogo" : `${count} exercícios no catálogo`;
}

export function ExerciciosContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [muscleGroupId, setMuscleGroupId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim(), 300);

  const groups = useQuery({
    queryKey: muscleGroupsQueryKey,
    queryFn: fetchMuscleGroups,
    staleTime: Infinity,
  });

  // Filtering, search and ordering are server-side: rows render in array order.
  const list = useQuery({
    queryKey: exercisesQueryKey({ muscleGroupId, q }),
    queryFn: () => fetchExercises({ muscleGroupId, q }),
    placeholderData: keepPreviousData,
  });

  const filterOptions = groups.isError
    ? []
    : [
        { value: "", label: "Todos os grupos" },
        ...(groups.data ?? []).map((g) => ({ value: String(g.id), label: g.name })),
      ];

  return (
    <div className="flex w-full flex-col gap-[var(--space-6)] px-[var(--space-8)] py-[var(--space-8)]">
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col gap-[6px]">
          <h1 className="font-heading text-[length:var(--text-2xl)] font-bold text-[color:var(--color-text-primary)]">
            Catálogo de exercícios
          </h1>
          <p className="text-[length:var(--text-base)] text-[color:var(--color-text-secondary)]">
            {list.data ? subtitle(list.data.length, muscleGroupId !== null || q !== "") : " "}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>Novo exercício</Button>
      </div>

      <div className="flex items-center gap-[var(--space-3)]">
        <div className="relative w-[340px]">
          <Search
            width={15}
            height={15}
            className="pointer-events-none absolute top-1/2 left-[14px] -translate-y-1/2 text-[color:var(--color-text-tertiary)]"
          />
          <TextField
            placeholder="Buscar por nome..."
            aria-label="Buscar por nome"
            maxLength={100}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="[&_input]:pl-[22px]"
          />
        </div>
        <Dropdown
          className="w-[240px]"
          placeholder={groups.isError ? "Grupos indisponíveis" : "Todos os grupos"}
          options={filterOptions}
          value={groups.isError ? undefined : String(muscleGroupId ?? "")}
          onChange={(value) => setMuscleGroupId(value ? Number(value) : null)}
          disabled={groups.isError}
        />
      </div>

      {list.isError && list.data && (
        <div
          role="alert"
          className="flex w-full items-center justify-between gap-[10px] rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[#ff5c5c14] py-[8px] pr-[8px] pl-[14px]"
        >
          <span className="text-[length:var(--text-sm)] text-[color:var(--color-text-primary)]">
            Não foi possível carregar os exercícios · Verifique sua conexão e tente novamente.
          </span>
          <Button variant="outline" size="sm" onClick={() => list.refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      <div className="flex w-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex w-full items-center gap-[var(--space-4)] px-[var(--space-5)] py-[var(--space-3)]">
          {HEADERS.map((header, i) => (
            <span
              key={i}
              style={{ width: header.width }}
              className="text-[10px] font-semibold tracking-[0.6px] text-[color:var(--color-text-tertiary)]"
            >
              {header.label}
            </span>
          ))}
        </div>

        {list.isPending ? (
          <div className="flex flex-col">
            {[0, 1, 2, 3, 4].map((i) => (
              <TableRowSkeleton key={i} className="border-t border-[var(--color-border)]" />
            ))}
          </div>
        ) : list.isError && !list.data ? (
          <div className="flex w-full flex-col items-center gap-2 border-t border-[var(--color-border)] px-[var(--space-5)] py-[var(--space-12)] text-center">
            <p className="text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
              Não foi possível carregar os exercícios
            </p>
            <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
              Verifique sua conexão e tente novamente.
            </p>
            <div className="pt-[8px]">
              <Button variant="outline" onClick={() => list.refetch()}>
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : list.data.length === 0 ? (
          <div className="flex w-full flex-col items-center gap-2 border-t border-[var(--color-border)] px-[var(--space-5)] py-[var(--space-12)] text-center">
            <p className="text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
              Nenhum exercício encontrado
            </p>
            <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
              Ajuste a busca ou o filtro de grupo muscular, ou cadastre um novo exercício.
            </p>
          </div>
        ) : (
          list.data.map((exercise) => (
            <ExerciseRow key={exercise.id} exercise={exercise} onEdit={setEditingExercise} />
          ))
        )}
      </div>

      {dialogOpen && <ExerciseDialog onClose={() => setDialogOpen(false)} />}
      {editingExercise && (
        <ExerciseDialog exercise={editingExercise} onClose={() => setEditingExercise(null)} />
      )}
    </div>
  );
}
