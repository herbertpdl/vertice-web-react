"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, DialogFooter, MultiSelect, TextField } from "@/components/ui";
import { createExercise, updateExercise, deleteExercise } from "@/lib/api/exercises";
import { fetchMuscleGroups, muscleGroupsQueryKey } from "@/lib/api/muscleGroups";
import { exerciseSchema, type ExerciseFormInput } from "@/lib/validation/exercises";
import type { Exercise } from "@/lib/api/types";

export interface ExerciseDialogApi {
  create: typeof createExercise;
  update: typeof updateExercise;
  remove: typeof deleteExercise;
}

const defaultApi: ExerciseDialogApi = {
  create: createExercise,
  update: updateExercise,
  remove: deleteExercise,
};

interface ExerciseDialogProps {
  /** Only ever the trainer's own exercise (`isStarter: false`): the catalog row gates editing. */
  exercise?: Exercise;
  onClose: () => void;
  onCreated?: (exercise: Exercise) => void;
  /** Injectable for stories (no BFF in Storybook); defaults to the real API calls. */
  api?: ExerciseDialogApi;
}

export function ExerciseDialog({
  exercise,
  onClose,
  onCreated,
  api = defaultApi,
}: ExerciseDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(exercise);

  const groups = useQuery({
    queryKey: muscleGroupsQueryKey,
    queryFn: fetchMuscleGroups,
    staleTime: Infinity,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<ExerciseFormInput>({
    mode: "onChange",
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: exercise?.name ?? "",
      muscleGroupIds: exercise?.muscleGroups.map((group) => group.id) ?? [],
      description: exercise?.description ?? "",
      videoUrl: exercise?.videoUrl ?? "",
    },
  });

  const muscleGroupIds = watch("muscleGroupIds");
  // Kept out of react-hook-form's `setError("root")`, which would force `isValid`
  // to false and lock the submit button until the next edit.
  const [rootError, setRootError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: (data: ExerciseFormInput) =>
      isEditing && exercise ? api.update(exercise.id, data) : api.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      onCreated?.(result);
      onClose();
    },
    // The server's message is English: the screen only ever shows fixed pt-BR copy.
    onError: () => setRootError("Não foi possível salvar o exercício"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.remove(exercise!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      onClose();
    },
    onError: () => setRootError("Não foi possível excluir o exercício"),
  });

  return (
    <Dialog title={isEditing ? "Editar exercício" : "Novo exercício"} onClose={onClose}>
      <form
        onSubmit={handleSubmit((data) => {
          setRootError(null);
          saveMutation.mutate(data);
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
          placeholder="Supino Reto com Barra"
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
          placeholder="Movimento composto para..."
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
          {isEditing && (
            <Button
              type="button"
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => {
                setRootError(null);
                deleteMutation.mutate();
              }}
              className="mr-auto"
            >
              Excluir
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={saveMutation.isPending}
            // Groups not loaded: the form can't be checked against them, so it can't be sent.
            disabled={!isValid || !groups.isSuccess}
          >
            {isEditing ? "Salvar alterações" : "Criar exercício"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
