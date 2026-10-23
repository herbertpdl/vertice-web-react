"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { Button, Dialog, DialogFooter, MultiSelect, TextField } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
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

/**
 * 403 on an edit/delete the UI offered means the row was stale (e.g. the list predates a change
 * made elsewhere): the caller refreshes the list so the affordance disappears, and says so in
 * fixed pt-BR copy.
 */
function isForbidden(error: unknown) {
  return error instanceof ApiError && error.code === "FORBIDDEN";
}

interface ExerciseDialogProps {
  /**
   * Only ever the trainer's own exercise (`isStarter: false`): the catalog row gates editing.
   * A trainer's list holds the starter set plus their own exercises only, so `!isStarter` means
   * "owned by the caller"; the payload carries no owner id.
   */
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
  // Defensive: a starter row never reaches this dialog through the UI (R28), but if it did, it
  // gets no Excluir.
  const canDelete = Boolean(exercise && !exercise.isStarter);

  const groups = useQuery({
    queryKey: muscleGroupsQueryKey,
    queryFn: fetchMuscleGroups,
    staleTime: Infinity,
  });

  const {
    register,
    handleSubmit,
    control,
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

  const muscleGroupIds = useWatch({ control, name: "muscleGroupIds" });
  // Kept out of react-hook-form's `setError("root")`, which would force `isValid`
  // to false and lock the submit button until the next edit.
  const [rootError, setRootError] = useState<string | null>(null);
  // Delete refused because a workout uses the exercise (409 PRECONDITION_FAILED, R34).
  const [refused, setRefused] = useState(false);
  // Excluir first asks for confirmation; the delete only runs from that step.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // The form's Excluir, focused again when the confirmation step goes back to the form.
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const refocusDeleteRef = useRef(false);

  // Both steps get an `onClose` that reads the latest values from refs (a pending delete must not
  // be cancelled by Escape). `Dialog` itself no longer cares about `onClose`'s identity.
  const onCloseRef = useRef(onClose);
  const deletePendingRef = useRef(false);
  // Set synchronously on the confirm click: `isPending` only shows up a render later, so a second
  // activation in between would otherwise start a second delete.
  const submittingRef = useRef(false);
  const closeForm = useCallback(() => onCloseRef.current(), []);
  const cancelDelete = useCallback(() => {
    if (deletePendingRef.current) return;
    refocusDeleteRef.current = true;
    setConfirmingDelete(false);
  }, []);

  const saveMutation = useMutation({
    mutationFn: (data: ExerciseFormInput) =>
      isEditing && exercise ? api.update(exercise.id, data) : api.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      onCreated?.(result);
      onClose();
    },
    // The server's message is English: the screen only ever shows fixed pt-BR copy.
    onError: (error) => {
      if (isEditing && isForbidden(error)) {
        queryClient.invalidateQueries({ queryKey: ["exercises"] });
        setRootError("Você não tem permissão para alterar este exercício");
      } else setRootError("Não foi possível salvar o exercício");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.remove(exercise!.id),
    onSettled: () => {
      submittingRef.current = false;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      onClose();
    },
    onError: (error) => {
      // Back to the form, where the refusal or error is shown.
      refocusDeleteRef.current = true;
      setConfirmingDelete(false);
      // Keyed on the code, not the status: 409 is also CONFLICT. The upstream
      // message is English and is not rendered.
      if (error instanceof ApiError && error.code === "PRECONDITION_FAILED") setRefused(true);
      else if (isForbidden(error)) {
        queryClient.invalidateQueries({ queryKey: ["exercises"] });
        setRootError("Você não tem permissão para excluir este exercício");
      } else setRootError("Não foi possível excluir o exercício");
    },
  });

  // Layout effect: the refs are current before any event can reach the committed DOM.
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    deletePendingRef.current = deleteMutation.isPending;
  });

  // Runs after the remounted form `Dialog`'s own effect (child effects run first), which focused
  // "Fechar": hand focus back to the Excluir that opened the confirmation step.
  useEffect(() => {
    if (confirmingDelete || !refocusDeleteRef.current) return;
    refocusDeleteRef.current = false;
    deleteButtonRef.current?.focus();
  }, [confirmingDelete]);

  if (confirmingDelete && exercise) {
    return (
      <Dialog key="confirm-delete" title="Excluir exercício?" onClose={cancelDelete}>
        <p className="text-[length:var(--text-base)] leading-[1.5] text-[color:var(--color-text-secondary)]">
          <span className="font-semibold text-[color:var(--color-text-primary)]">
            {exercise.name}
          </span>{" "}
          será removido do seu catálogo. Esta ação não pode ser desfeita.
        </p>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={cancelDelete}
            disabled={deleteMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={deleteMutation.isPending}
            // `loading` alone leaves the button keyboard-activatable: Enter/Space would delete twice.
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (submittingRef.current) return;
              submittingRef.current = true;
              setRootError(null);
              setRefused(false);
              deleteMutation.mutate();
            }}
          >
            Excluir exercício
          </Button>
        </DialogFooter>
      </Dialog>
    );
  }

  return (
    <Dialog
      key="form"
      title={isEditing ? "Editar exercício" : "Novo exercício"}
      onClose={closeForm}
    >
      <form
        onSubmit={handleSubmit((data) => {
          setRootError(null);
          saveMutation.mutate(data);
        })}
        className="flex w-full flex-col gap-[var(--space-4)]"
      >
        {refused && (
          <div
            role="alert"
            className="flex w-full items-start gap-[var(--space-3)] rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[#ff5c5c14] p-[var(--space-4)]"
          >
            <TriangleAlert
              width={20}
              height={20}
              className="shrink-0 text-[color:var(--color-danger)]"
            />
            <div className="flex flex-1 flex-col gap-[4px]">
              <span className="font-heading text-[length:var(--text-md)] font-semibold text-[color:var(--color-danger)]">
                Não é possível excluir este exercício
              </span>
              <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-primary)]">
                Um treino usa este exercício. Remova-o dos treinos antes de excluí-lo.
              </p>
            </div>
          </div>
        )}
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
          helpText="Cole um link do YouTube."
          error={errors.videoUrl?.message}
          {...register("videoUrl")}
        />
        <DialogFooter>
          {canDelete && (
            <Button
              ref={deleteButtonRef}
              type="button"
              variant="danger"
              onClick={() => setConfirmingDelete(true)}
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
