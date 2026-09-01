"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, DialogFooter, Dropdown, TextField } from "@/components/ui";
import { createExercise, updateExercise, deleteExercise } from "@/lib/api/exercises";
import {
  exerciseSchema,
  muscleGroupLabels,
  type ExerciseFormInput,
} from "@/lib/validation/exercises";
import type { Exercise } from "@/lib/api/types";

const groupOptions = Object.entries(muscleGroupLabels).map(([value, label]) => ({
  value,
  label,
}));

interface ExerciseDialogProps {
  exercise?: Exercise;
  onClose: () => void;
  onCreated?: (exercise: Exercise) => void;
}

export function ExerciseDialog({ exercise, onClose, onCreated }: ExerciseDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(exercise);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ExerciseFormInput>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: exercise?.name ?? "",
      muscleGroup: exercise?.muscleGroup ?? "CHEST",
      description: exercise?.description ?? "",
      videoUrl: exercise?.videoUrl ?? "",
    },
  });

  const muscleGroup = watch("muscleGroup");

  const saveMutation = useMutation({
    mutationFn: (data: ExerciseFormInput) =>
      isEditing && exercise ? updateExercise(exercise.id, data) : createExercise(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      onCreated?.(result);
      onClose();
    },
    onError: (error) => {
      setError("root", {
        message: error instanceof Error ? error.message : "Não foi possível salvar o exercício",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteExercise(exercise!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      onClose();
    },
    onError: (error) => {
      setError("root", {
        message: error instanceof Error ? error.message : "Não foi possível excluir o exercício",
      });
    },
  });

  return (
    <Dialog title={isEditing ? "Editar exercício" : "Novo exercício"} onClose={onClose}>
      <form
        onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
        className="flex w-full flex-col gap-[var(--space-4)]"
      >
        {errors.root && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-danger)]">
            {errors.root.message}
          </div>
        )}
        <TextField
          label="Nome do exercício"
          placeholder="Supino Reto com Barra"
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
              onClick={() => deleteMutation.mutate()}
              className="mr-auto"
            >
              Excluir
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saveMutation.isPending}>
            {isEditing ? "Salvar alterações" : "Criar exercício"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
