"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, DateField, Dialog, DialogFooter, Dropdown, TextField } from "@/components/ui";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { createTrainingPlan, updateTrainingPlan } from "@/lib/api/trainingPlans";
import {
  minPlanEndDate,
  minPlanStartDate,
  trainingPlanSchema,
  planLevelLabels,
  type TrainingPlanFormInput,
} from "@/lib/validation/trainingPlans";
import type { TrainingPlan } from "@/lib/api/types";

const levelOptions = Object.entries(planLevelLabels).map(([value, label]) => ({
  value,
  label,
}));

export interface PlanDialogApi {
  create: typeof createTrainingPlan;
  update: typeof updateTrainingPlan;
}

const defaultApi: PlanDialogApi = { create: createTrainingPlan, update: updateTrainingPlan };

interface PlanDialogProps {
  clientId: number;
  plan?: TrainingPlan;
  onClose: () => void;
  onSuccess?: (plan: TrainingPlan) => void;
  /** Injected by stories (no BFF in Storybook); defaults to the real calls. */
  api?: PlanDialogApi;
  /** Pinned by stories so the date rules don't move with the calendar. Defaults to today. */
  today?: string;
}

export function PlanDialog({
  clientId,
  plan,
  onClose,
  onSuccess,
  api = defaultApi,
  today,
}: PlanDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(plan);
  // Frozen at mount: both the schema and the fields' bounds read it, and "today" moving under an
  // open dialog would invalidate what the trainer already picked.
  const [minStartDate] = useState(() => minPlanStartDate(plan?.startDate, today));

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    trigger,
    formState: { errors, isSubmitted },
  } = useForm<TrainingPlanFormInput>({
    resolver: zodResolver(trainingPlanSchema(minStartDate, plan)),
    defaultValues: {
      name: plan?.name ?? "",
      description: plan?.description ?? "",
      startDate: plan?.startDate ?? "",
      endDate: plan?.endDate ?? "",
      level: plan?.level ?? "BEGINNER",
    },
  });

  const level = useWatch({ control, name: "level" });
  const startDate = useWatch({ control, name: "startDate" });
  const endDate = useWatch({ control, name: "endDate" });

  /**
   * `DateField` is controlled, not `register`ed, so no change event reaches react-hook-form and
   * `reValidateMode` never fires on its own — a message would sit there while the trainer fixed
   * the very thing it complains about. Both dates are re-checked together because the rules are
   * cross-field, and only after a first submit, so a half-typed date doesn't flash "Informe a
   * data…" at someone who has not tried to save yet.
   */
  function setDate(field: "startDate" | "endDate", nextValue: string) {
    setValue(field, nextValue, { shouldDirty: true });
    if (isSubmitted) void trigger(["startDate", "endDate"]);
  }

  const mutation = useMutation({
    mutationFn: (data: TrainingPlanFormInput) =>
      isEditing && plan ? api.update(plan.id, data) : api.create({ ...data, clientId }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["trainingPlans", { clientId }] });
      queryClient.invalidateQueries({ queryKey: ["student", clientId, "overview"] });
      queryClient.invalidateQueries({ queryKey: ["trainingPlan", result.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onSuccess?.(result);
      onClose();
    },
    onError: (error) => {
      setError("root", { message: apiErrorMessage(error, "Não foi possível salvar o plano") });
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
          <DateField
            label="Início"
            value={startDate}
            onChange={(value) => setDate("startDate", value)}
            min={minStartDate}
            today={today}
            error={errors.startDate?.message}
            className="flex-1"
          />
          <DateField
            label="Término"
            value={endDate}
            onChange={(value) => setDate("endDate", value)}
            // A plan can't end on the day it starts, so the earliest end is the day after.
            // `trainingPlanSchema` enforces the same rule; the calendar just stops offering
            // the days it would reject.
            min={minPlanEndDate(startDate, minStartDate)}
            today={today}
            error={errors.endDate?.message}
            className="flex-1"
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
