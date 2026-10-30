"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button, Dropdown, Spinner, TableRowSkeleton, TextField } from "@/components/ui";
import { ExerciseDialog } from "@/components/domain/ExerciseDialog";
import { EXERCISE_COLUMN_WIDTHS, ExerciseRow } from "@/components/domain/ExerciseRow";
import { fetchMuscleGroups, muscleGroupsQueryKey } from "@/lib/api/muscleGroups";
import { useExerciseSearch } from "@/lib/hooks/useExerciseSearch";
import { useLoadMoreRef } from "@/lib/hooks/useLoadMoreRef";
import type { Exercise } from "@/lib/api/types";

const HEADERS = [
  { label: "EXERCÍCIO", width: EXERCISE_COLUMN_WIDTHS.name },
  { label: "DESCRIÇÃO", width: EXERCISE_COLUMN_WIDTHS.description },
  { label: "VÍDEO", width: EXERCISE_COLUMN_WIDTHS.video },
  { label: "", width: EXERCISE_COLUMN_WIDTHS.edit },
];

/** Pages load as the list scrolls, so with more to come only a lower bound is known. */
function subtitle(count: number, hasMore: boolean) {
  if (hasMore) return `Mais de ${count} exercícios encontrados`;
  return count === 1 ? "1 exercício encontrado" : `${count} exercícios encontrados`;
}

export function ExerciciosContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [muscleGroupId, setMuscleGroupId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const groups = useQuery({
    queryKey: muscleGroupsQueryKey,
    queryFn: fetchMuscleGroups,
    staleTime: Infinity,
  });

  // Never the whole catalog: nothing until 3+ letters or a group, then one page at a time as the
  // list scrolls (lazy-exercise-search). Filtering, search and ordering are server-side: rows
  // render in array order.
  const list = useExerciseSearch(search, muscleGroupId);
  const loadMoreRef = useLoadMoreRef(
    () => void list.fetchNextPage(),
    list.hasNextPage && !list.isFetchingNextPage && !list.isError,
  );

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
            {list.idle
              ? "Busque por nome ou escolha um grupo muscular"
              : list.exercises
                ? subtitle(list.exercises.length, list.hasNextPage)
                : " "}
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

      {list.isError && list.exercises && (
        <div
          role="alert"
          className="flex w-full items-center justify-between gap-[10px] rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[#ff5c5c14] py-[8px] pr-[8px] pl-[14px]"
        >
          <span className="text-[length:var(--text-sm)] text-[color:var(--color-text-primary)]">
            Não foi possível carregar os exercícios · Verifique sua conexão e tente novamente.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (list.isFetchNextPageError ? list.fetchNextPage() : list.refetch())}
          >
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

        {list.idle ? (
          <div className="flex w-full flex-col items-center gap-2 border-t border-[var(--color-border)] px-[var(--space-5)] py-[var(--space-12)] text-center">
            <p className="text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
              Busque um exercício
            </p>
            <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
              Digite ao menos 3 letras ou escolha um grupo muscular.
            </p>
          </div>
        ) : list.isPending ? (
          <div className="flex flex-col">
            {[0, 1, 2, 3, 4].map((i) => (
              <TableRowSkeleton key={i} className="border-t border-[var(--color-border)]" />
            ))}
          </div>
        ) : list.isError && !list.exercises ? (
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
        ) : !list.exercises || list.exercises.length === 0 ? (
          <div className="flex w-full flex-col items-center gap-2 border-t border-[var(--color-border)] px-[var(--space-5)] py-[var(--space-12)] text-center">
            <p className="text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
              Nenhum exercício encontrado
            </p>
            <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
              Ajuste a busca ou o filtro de grupo muscular, ou cadastre um novo exercício.
            </p>
          </div>
        ) : (
          <>
            {list.exercises.map((exercise) => (
              <ExerciseRow key={exercise.id} exercise={exercise} onEdit={setEditingExercise} />
            ))}
            {list.hasNextPage && <div ref={loadMoreRef} aria-hidden className="h-px w-full" />}
            {list.isFetchingNextPage && (
              <div
                role="status"
                aria-label="Carregando mais exercícios"
                className="flex justify-center border-t border-[var(--color-border)] py-[var(--space-4)]"
              >
                <Spinner />
              </div>
            )}
          </>
        )}
      </div>

      {dialogOpen && <ExerciseDialog onClose={() => setDialogOpen(false)} />}
      {editingExercise && (
        <ExerciseDialog exercise={editingExercise} onClose={() => setEditingExercise(null)} />
      )}
    </div>
  );
}
