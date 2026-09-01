"use client";

import { useMemo, useState } from "react";
import { CirclePlay, Pencil, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button, TableRowSkeleton, TextField } from "@/components/ui";
import { ExerciseDialog } from "@/components/domain/ExerciseDialog";
import { fetchExercises } from "@/lib/api/exercises";
import { muscleGroupLabels } from "@/lib/validation/exercises";
import type { Exercise } from "@/lib/api/types";

const COLUMN_WIDTHS = { name: 260, description: 380, video: 90, edit: 60 };

export default function ExerciciosPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [search, setSearch] = useState("");

  const { data, isPending } = useQuery({
    queryKey: ["exercises"],
    queryFn: fetchExercises,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (ex) =>
        ex.name.toLowerCase().includes(q) ||
        muscleGroupLabels[ex.muscleGroup].toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="flex w-full flex-col gap-[var(--space-6)] px-[var(--space-8)] py-[var(--space-8)]">
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col gap-[6px]">
          <h1 className="font-heading text-[length:var(--text-2xl)] font-bold text-[color:var(--color-text-primary)]">
            Catálogo de exercícios
          </h1>
          <p className="text-[length:var(--text-base)] text-[color:var(--color-text-secondary)]">
            {data ? `${data.length} exercícios cadastrados` : " "}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>Novo exercício</Button>
      </div>

      <div className="relative w-[340px]">
        <Search
          width={15}
          height={15}
          className="pointer-events-none absolute top-1/2 left-[14px] -translate-y-1/2 text-[color:var(--color-text-tertiary)]"
        />
        <TextField
          placeholder="Buscar por nome ou grupo muscular..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="[&_input]:pl-[22px]"
        />
      </div>

      <div className="flex w-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex w-full items-center gap-[var(--space-4)] px-[var(--space-5)] py-[var(--space-3)]">
          <span style={{ width: COLUMN_WIDTHS.name }} className="text-[10px] font-semibold tracking-[0.6px] text-[color:var(--color-text-tertiary)]">
            EXERCÍCIO
          </span>
          <span style={{ width: COLUMN_WIDTHS.description }} className="text-[10px] font-semibold tracking-[0.6px] text-[color:var(--color-text-tertiary)]">
            DESCRIÇÃO
          </span>
          <span style={{ width: COLUMN_WIDTHS.video }} className="text-[10px] font-semibold tracking-[0.6px] text-[color:var(--color-text-tertiary)]">
            VÍDEO
          </span>
          <span style={{ width: COLUMN_WIDTHS.edit }} />
        </div>

        {isPending ? (
          <div className="flex flex-col">
            {[0, 1, 2, 3, 4].map((i) => (
              <TableRowSkeleton key={i} className="border-t border-[var(--color-border)]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex w-full flex-col items-center gap-2 border-t border-[var(--color-border)] px-[var(--space-5)] py-[var(--space-12)] text-center">
            <p className="text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
              Nenhum exercício encontrado
            </p>
            <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
              Ajuste sua busca ou cadastre um novo exercício.
            </p>
          </div>
        ) : (
          filtered.map((exercise) => (
            <div
              key={exercise.id}
              className="flex w-full items-center gap-[var(--space-4)] border-t border-[var(--color-border)] px-[var(--space-5)] py-[var(--space-4)]"
            >
              <div style={{ width: COLUMN_WIDTHS.name }} className="flex flex-col gap-[4px]">
                <span className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">
                  {exercise.name}
                </span>
                <span className="w-fit rounded-[var(--radius-full)] bg-[var(--color-surface-hover)] px-[8px] py-[2px] text-[10px] font-semibold text-[color:var(--color-text-secondary)]">
                  {muscleGroupLabels[exercise.muscleGroup]}
                </span>
              </div>
              <p
                style={{ width: COLUMN_WIDTHS.description }}
                className="text-[12px] leading-[1.4] text-[color:var(--color-text-secondary)]"
              >
                {exercise.description}
              </p>
              <div style={{ width: COLUMN_WIDTHS.video }} className="flex items-center justify-center">
                {exercise.videoUrl ? (
                  <a href={exercise.videoUrl} target="_blank" rel="noreferrer">
                    <CirclePlay width={16} height={16} className="text-[color:var(--color-primary)]" />
                  </a>
                ) : (
                  <span className="text-[12px] text-[color:var(--color-text-tertiary)]">—</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEditingExercise(exercise)}
                aria-label="Editar exercício"
                style={{ width: COLUMN_WIDTHS.edit }}
                className="flex items-center justify-center text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]"
              >
                <Pencil width={16} height={16} />
              </button>
            </div>
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
