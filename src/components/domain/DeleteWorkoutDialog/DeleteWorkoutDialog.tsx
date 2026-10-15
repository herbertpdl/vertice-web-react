"use client";

import { useQueryClient } from "@tanstack/react-query";
import { deleteErrorMessage } from "@/lib/api/errorMessages";
import { deleteWorkout } from "@/lib/api/workouts";
import { ConfirmDialog } from "../ConfirmDialog";

export interface DeleteWorkoutApi {
  remove: typeof deleteWorkout;
}

const defaultApi: DeleteWorkoutApi = { remove: deleteWorkout };

interface DeleteWorkoutDialogProps {
  workout: { id: number; name: string };
  planId: number;
  onClose: () => void;
  /** After the 204: the editor goes back to the plan. */
  onDeleted: () => void;
  /** Injected by the editor (it settles its autosave first) and by stories. */
  api?: DeleteWorkoutApi;
}

/**
 * "Excluir treino" (`DELETE /workouts/:id`). Refused with 409 `PRECONDITION_FAILED` once a client
 * recorded training under it, shown with its own copy.
 */
export function DeleteWorkoutDialog({
  workout,
  planId,
  onClose,
  onDeleted,
  api = defaultApi,
}: DeleteWorkoutDialogProps) {
  const queryClient = useQueryClient();

  return (
    <ConfirmDialog
      title="Excluir treino?"
      confirmLabel="Excluir treino"
      onConfirm={() => api.remove(workout.id)}
      errorMessage={(error) =>
        deleteErrorMessage(error, "workout", "Não foi possível excluir o treino. Tente novamente.")
      }
      onDone={() => {
        queryClient.invalidateQueries({ queryKey: ["trainingPlan", planId] });
        queryClient.invalidateQueries({ queryKey: ["workouts", planId] });
        queryClient.invalidateQueries({ queryKey: ["recentWorkouts"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        // Not refetched: the editor still observes it and would bounce on the 404.
        queryClient.invalidateQueries({ queryKey: ["workout", workout.id], refetchType: "none" });
        onDeleted();
      }}
      onClose={onClose}
    >
      <p>
        O treino <span className="font-semibold text-[color:var(--color-text-primary)]">{workout.name}</span>{" "}
        e os exercícios dele serão excluídos do plano.{" "}
        <span className="font-semibold text-[color:var(--color-text-primary)]">
          Esta ação não pode ser desfeita.
        </span>
      </p>
    </ConfirmDialog>
  );
}
