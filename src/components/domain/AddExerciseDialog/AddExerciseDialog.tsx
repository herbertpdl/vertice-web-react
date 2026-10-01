"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, CirclePlay, Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, DialogFooter, MultiSelect, TextField } from "@/components/ui";
import { createExercise, exercisesQueryKey, fetchExercises } from "@/lib/api/exercises";
import { fetchMuscleGroups, muscleGroupsQueryKey } from "@/lib/api/muscleGroups";
import { exerciseSchema, type ExerciseFormInput } from "@/lib/validation/exercises";
import { MAX_EXERCISES } from "@/lib/workoutEditor/model";
import type { Exercise } from "@/lib/api/types";

interface AddExerciseDialogProps {
  /** The workout already has 20 exercises: browsing stays possible, adding does not (R21, E5). */
  atCap?: boolean;
  onClose: () => void;
  /** Hands the picked catalog exercise to the editor, which adds it to the draft (R14). */
  onPick: (exercise: Exercise) => void;
}

export function AddExerciseDialog({ atCap = false, onClose, onPick }: AddExerciseDialogProps) {
  const [mode, setMode] = useState<"search" | "create">("search");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: exercises } = useQuery({
    queryKey: exercisesQueryKey({}),
    queryFn: () => fetchExercises(),
  });
  const groups = useQuery({
    queryKey: muscleGroupsQueryKey,
    queryFn: fetchMuscleGroups,
    staleTime: Infinity,
  });

  function pick(exercise: Exercise) {
    if (atCap) return;
    onPick(exercise);
    onClose();
  }

  const filtered = useMemo(() => {
    if (!exercises) return [];
    const q = search.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((ex) => ex.name.toLowerCase().includes(q));
  }, [exercises, search]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<ExerciseFormInput>({
    mode: "onChange",
    resolver: zodResolver(exerciseSchema),
    defaultValues: { name: "", muscleGroupIds: [], description: "", videoUrl: "" },
  });
  const muscleGroupIds = watch("muscleGroupIds");
  // Local state rather than `setError("root")`, which would force `isValid` to false.
  const [rootError, setRootError] = useState<string | null>(null);

  // Creating from the picker adds to the catalog right away (R23); adding it
  // to the workout then follows the same path as a catalog pick.
  const createMutation = useMutation({
    mutationFn: (data: ExerciseFormInput) => createExercise(data),
    onSuccess: (exercise: Exercise) => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      pick(exercise);
    },
    // The server's message is English: only fixed pt-BR copy reaches the screen.
    onError: () => setRootError("Não foi possível criar o exercício"),
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

      {atCap && (
        <div className="flex w-full items-start gap-[10px] rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[#ffb02014] px-[14px] py-[12px]">
          <CircleAlert
            width={16}
            height={16}
            className="mt-[1px] shrink-0 text-[color:var(--color-warning)]"
          />
          <div className="flex flex-col gap-[4px]">
            <span className="text-[13px] font-semibold text-[color:var(--color-warning)]">
              Este treino já tem {MAX_EXERCISES} exercícios — o máximo permitido
            </span>
            <span className="text-[12px] text-[color:var(--color-text-secondary)]">
              Você pode continuar navegando pelo catálogo, mas para adicionar outro exercício
              remova um do treino primeiro.
            </span>
          </div>
        </div>
      )}

      {mode === "search" ? (
        <div className="flex w-full flex-col gap-[var(--space-3)]">
          <div className="relative w-full">
            <Search
              width={15}
              height={15}
              className="pointer-events-none absolute top-1/2 left-[14px] -translate-y-1/2 text-[color:var(--color-text-tertiary)]"
            />
            <TextField
              placeholder="Buscar exercício por nome..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="[&_input]:pl-[22px]"
            />
          </div>
          <div className="flex max-h-[320px] flex-col gap-[var(--space-2)] overflow-y-auto">
            {filtered.map((exercise) => (
              <div
                key={exercise.id}
                className="flex w-full items-center justify-between gap-[var(--space-3)] rounded-[var(--radius-md)] bg-[var(--color-bg)] p-[var(--space-3)]"
              >
                <div className="flex min-w-0 flex-col gap-[2px]">
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">
                      {exercise.name}
                    </span>
                    {exercise.muscleGroups.map((group) => (
                      <span
                        key={group.id}
                        className="rounded-[var(--radius-full)] bg-[var(--color-surface-hover)] px-[8px] py-[2px] text-[10px] font-semibold text-[color:var(--color-text-secondary)]"
                      >
                        {group.name}
                      </span>
                    ))}
                    {exercise.videoUrl && (
                      <CirclePlay width={12} height={12} className="text-[color:var(--color-primary)]" />
                    )}
                  </div>
                  {exercise.description && (
                    <span className="truncate text-[11px] text-[color:var(--color-text-tertiary)]">
                      {exercise.description}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => pick(exercise)}
                  disabled={atCap}
                  aria-label={`Adicionar ${exercise.name}`}
                  className="shrink-0 !px-[14px] !py-[6px] !text-[12px]"
                >
                  Adicionar
                </Button>
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
          onSubmit={handleSubmit((data) => {
            setRootError(null);
            createMutation.mutate(data);
          })}
          className="flex w-full flex-col gap-[var(--space-4)]"
        >
          {rootError && (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-danger)]">
              {rootError}
            </div>
          )}
          <TextField
            label="Nome do exercício"
            placeholder="Nome"
            error={errors.name?.message}
            {...register("name")}
          />
          <div className="flex flex-col gap-[6px]">
            <MultiSelect
              label="Grupos musculares"
              placeholder="Selecione os grupos"
              options={(groups.data ?? []).map((g) => ({ value: String(g.id), label: g.name }))}
              value={muscleGroupIds.map(String)}
              onChange={(ids) =>
                setValue("muscleGroupIds", ids.map(Number), {
                  shouldValidate: true,
                  shouldTouch: true,
                })
              }
              disabled={!groups.isSuccess}
              error={errors.muscleGroupIds?.message}
            />
            {groups.isError && (
              <p className="flex items-center gap-[6px] text-[11px]">
                <span className="text-[color:var(--color-danger)]">
                  Não foi possível carregar os grupos musculares
                </span>
                <button
                  type="button"
                  onClick={() => groups.refetch()}
                  className="font-semibold text-[color:var(--color-primary)]"
                >
                  Tentar novamente
                </button>
              </p>
            )}
          </div>
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
              loading={createMutation.isPending}
              disabled={atCap || !isValid || !groups.isSuccess}
            >
              Criar e adicionar
            </Button>
          </DialogFooter>
        </form>
      )}
    </Dialog>
  );
}
