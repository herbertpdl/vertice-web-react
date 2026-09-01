"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, DialogFooter, Dropdown, TextField } from "@/components/ui";
import { createTrainingPlan, updateTrainingPlan } from "@/lib/api/trainingPlans";
import {
  trainingPlanSchema,
  planLevelLabels,
  type TrainingPlanFormInput,
} from "@/lib/validation/trainingPlans";
import type { TrainingPlan } from "@/lib/api/types";

const levelOptions = Object.entries(planLevelLabels).map(([value, label]) => ({
  value,
  label,
}));

interface PlanDialogProps {
  clientId: number;
  plan?: TrainingPlan;
  onClose: () => void;
  onSuccess?: (plan: TrainingPlan) => void;
}

export function PlanDialog({ clientId, plan, onClose, onSuccess }: PlanDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(plan);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<TrainingPlanFormInput>({
    resolver: zodResolver(trainingPlanSchema),
    defaultValues: {
      name: plan?.name ?? "",
      description: plan?.description ?? "",
      startDate: plan?.startDate ?? "",
      endDate: plan?.endDate ?? "",
      level: plan?.level ?? "BEGINNER",
    },
  });

  const level = watch("level");

  const mutation = useMutation({
    mutationFn: (data: TrainingPlanFormInput) =>
      isEditing && plan
        ? updateTrainingPlan(plan.id, data)
        : createTrainingPlan({ ...data, clientId }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["trainingPlans", { clientId }] });
      queryClient.invalidateQueries({ queryKey: ["student", clientId, "overview"] });
      queryClient.invalidateQueries({ queryKey: ["trainingPlan", result.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onSuccess?.(result);
      onClose();
    },
    onError: (error) => {
      setError("root", {
        message: error instanceof Error ? error.message : "Não foi possível salvar o plano",
      });
    },
  });

  return (
    <Dialog title={isEditing ? "Editar plano" : "Novo plano"} onClose={onClose}>
      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="flex w-full flex-col gap-[var(--space-4)]"
      >
        {errors.root && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-danger)]">
            {errors.root.message}
          </div>
        )}
        <TextField
          label="Nome do plano"
          placeholder="Hipertrofia — Fase 1"
          error={errors.name?.message}
          {...register("name")}
        />
        <TextField
          label="Descrição"
          placeholder="Foco, observações gerais..."
          error={errors.description?.message}
          {...register("description")}
        />
        <div className="flex w-full gap-[var(--space-3)]">
          <TextField
            label="Início"
            type="date"
            error={errors.startDate?.message}
            className="flex-1"
            {...register("startDate")}
          />
          <TextField
            label="Término"
            type="date"
            error={errors.endDate?.message}
            className="flex-1"
            {...register("endDate")}
          />
        </div>
        <Dropdown
          label="Nível"
          options={levelOptions}
          value={level}
          onChange={(value) => setValue("level", value as TrainingPlanFormInput["level"])}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEditing ? "Salvar alterações" : "Criar plano"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
