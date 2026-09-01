"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, DialogFooter, Dropdown, TextField } from "@/components/ui";
import { fetchExercises, createExercise } from "@/lib/api/exercises";
import { addWorkoutExercise } from "@/lib/api/workoutExercises";
import { exerciseSchema, muscleGroupLabels, type ExerciseFormInput } from "@/lib/validation/exercises";
import type { Exercise } from "@/lib/api/types";

const groupOptions = Object.entries(muscleGroupLabels).map(([value, label]) => ({
  value,
  label,
}));

interface AddExerciseDialogProps {
  workoutId: number;
  nextOrder: number;
  onClose: () => void;
  onAdded: () => void;
}

export function AddExerciseDialog({ workoutId, nextOrder, onClose, onAdded }: AddExerciseDialogProps) {
  const [mode, setMode] = useState<"search" | "create">("search");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: exercises } = useQuery({ queryKey: ["exercises"], queryFn: fetchExercises });

  const filtered = useMemo(() => {
    if (!exercises) return [];
    const q = search.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((ex) => ex.name.toLowerCase().includes(q));
  }, [exercises, search]);

  const addMutation = useMutation({
    mutationFn: (exerciseId: number) =>
      addWorkoutExercise(workoutId, { exerciseId, order: nextOrder, restSecondsBetweenSets: 60 }),
    onSuccess: () => {
      onAdded();
      onClose();
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ExerciseFormInput>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: { name: "", muscleGroup: "CHEST", description: "", videoUrl: "" },
  });
  const muscleGroup = watch("muscleGroup");

  const createMutation = useMutation({
    mutationFn: (data: ExerciseFormInput) => createExercise(data),
    onSuccess: (exercise: Exercise) => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      addMutation.mutate(exercise.id);
    },
    onError: (error) => {
      setError("root", {
        message: error instanceof Error ? error.message : "Não foi possível criar o exercício",
      });
    },
  });

  return (
    <Dialog title="Adicionar exercício" onClose={onClose} width={520}>
      <div className="flex w-full items-center gap-[2px] rounded-[var(--radius-md)] bg-[var(--color-surface-hover)] p-[3px]">
        <button
          type="button"
          onClick={() => setMode("search")}
          className={`flex-1 rounded-[var(--radius-sm)] py-[7px] text-[length:var(--text-sm)] font-semibold transition-colors ${
            mode === "search"
              ? "bg-[var(--color-surface-active)] text-[color:var(--color-text-primary)]"
              : "text-[color:var(--color-text-secondary)]"
          }`}
        >
          Buscar no catálogo
        </button>
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`flex-1 rounded-[var(--radius-sm)] py-[7px] text-[length:var(--text-sm)] font-semibold transition-colors ${
            mode === "create"
              ? "bg-[var(--color-surface-active)] text-[color:var(--color-text-primary)]"
              : "text-[color:var(--color-text-secondary)]"
          }`}
        >
          Criar novo
        </button>
      </div>

      {mode === "search" ? (
        <div className="flex w-full flex-col gap-[var(--space-3)]">
          <div className="relative w-full">
            <Search
              width={15}
              height={15}
              className="pointer-events-none absolute top-1/2 left-[14px] -translate-y-1/2 text-[color:var(--color-text-tertiary)]"
            />
            <TextField
              placeholder="Buscar exercício..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="[&_input]:pl-[22px]"
            />
          </div>
          <div className="flex max-h-[320px] flex-col gap-[var(--space-2)] overflow-y-auto">
            {filtered.map((exercise) => (
              <div
                key={exercise.id}
                className="flex w-full items-center justify-between gap-[var(--space-3)] rounded-[var(--radius-md)] border border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-3)]"
              >
                <div className="flex flex-col gap-[2px]">
                  <span className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">
                    {exercise.name}
                  </span>
                  <span className="text-[11px] text-[color:var(--color-text-tertiary)]">
                    {muscleGroupLabels[exercise.muscleGroup]}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => addMutation.mutate(exercise.id)}
                  disabled={addMutation.isPending}
                  aria-label="Adicionar"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-surface-hover)] text-[color:var(--color-primary)] hover:bg-[var(--color-surface-active)]"
                >
                  <Plus width={15} height={15} />
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="py-[var(--space-4)] text-center text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
                Não encontrou o exercício?{" "}
                <button
                  type="button"
                  onClick={() => setMode("create")}
                  className="font-semibold text-[color:var(--color-primary)]"
                >
                  Criar novo →
                </button>
              </p>
            )}
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit((data) => createMutation.mutate(data))}
          className="flex w-full flex-col gap-[var(--space-4)]"
        >
          {errors.root && (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-danger)]">
              {errors.root.message}
            </div>
          )}
          <TextField
            label="Nome do exercício"
            placeholder="Nome"
            error={errors.name?.message}
            {...register("name")}
          />
          <Dropdown
            label="Grupo muscular"
            options={groupOptions}
            value={muscleGroup}
            onChange={(value) => setValue("muscleGroup", value as ExerciseFormInput["muscleGroup"])}
          />
          <TextField
            label="Descrição"
            error={errors.description?.message}
            {...register("description")}
          />
          <TextField
            label="URL do vídeo (opcional)"
            placeholder="https://..."
            error={errors.videoUrl?.message}
            {...register("videoUrl")}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={createMutation.isPending || addMutation.isPending}
            >
              Criar e adicionar
            </Button>
          </DialogFooter>
        </form>
      )}
    </Dialog>
  );
}
