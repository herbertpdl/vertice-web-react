"use client";

import { useQueryClient } from "@tanstack/react-query";
import { deleteErrorMessage } from "@/lib/api/errorMessages";
import { deleteTrainingPlan } from "@/lib/api/trainingPlans";
import { ConfirmDialog } from "../ConfirmDialog";

export interface DeletePlanApi {
  remove: typeof deleteTrainingPlan;
}

const defaultApi: DeletePlanApi = { remove: deleteTrainingPlan };

interface DeletePlanDialogProps {
  plan: { id: number; name: string; clientId: number };
  onClose: () => void;
  /** After the 204: the page goes back to the student. */
  onDeleted: () => void;
  /** Injected by stories (no BFF in Storybook); defaults to the real call. */
  api?: DeletePlanApi;
}

/**
 * "Excluir plano" (`DELETE /training-plans/:id`). Refused with 409 `PRECONDITION_FAILED` once a
 * client recorded training under it, shown with its own copy.
 */
export function DeletePlanDialog({ plan, onClose, onDeleted, api = defaultApi }: DeletePlanDialogProps) {
  const queryClient = useQueryClient();

  return (
    <ConfirmDialog
      title="Excluir plano?"
      confirmLabel="Excluir plano"
      onConfirm={() => api.remove(plan.id)}
      errorMessage={(error) =>
        deleteErrorMessage(error, "trainingPlan", "Não foi possível excluir o plano. Tente novamente.")
      }
      onDone={() => {
        queryClient.invalidateQueries({ queryKey: ["trainingPlans", { clientId: plan.clientId }] });
        queryClient.invalidateQueries({ queryKey: ["student", plan.clientId, "overview"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["recentWorkouts"] });
        // Not refetched: the plan page still observes it and would bounce on the 404.
        queryClient.invalidateQueries({ queryKey: ["trainingPlan", plan.id], refetchType: "none" });
        onDeleted();
      }}
      onClose={onClose}
    >
      <p>
        O plano <span className="font-semibold text-[color:var(--color-text-primary)]">{plan.name}</span>{" "}
        e todos os treinos dele serão excluídos.{" "}
        <span className="font-semibold text-[color:var(--color-text-primary)]">
          Esta ação não pode ser desfeita.
        </span>
      </p>
    </ConfirmDialog>
  );
}
