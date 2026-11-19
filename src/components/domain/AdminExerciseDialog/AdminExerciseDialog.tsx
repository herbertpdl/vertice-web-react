"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { Button, Dialog, DialogFooter, MultiSelect, TextArea, TextField, useToast } from "@/components/ui";
import {
  exerciseFormDefaults,
  exerciseRequest,
  exerciseSaveError,
  exerciseSavedMessage,
  invalidateAfterExerciseWrite,
  type ExerciseDialogMode,
} from "@/lib/admin/catalog";
import { adminKeys } from "@/lib/api/admin";
import {
  createAdminStarterExercise,
  promoteAdminExercise,
  updateAdminStarterExercise,
} from "@/lib/api/adminCatalog";
import { MUSCLE_GROUPS_STALE_TIME, fetchMuscleGroups } from "@/lib/api/muscleGroups";
import type { AdminCatalogExercise } from "@/lib/api/types";
import { exerciseSchema, type ExerciseFormInput } from "@/lib/validation/exercises";

export interface AdminExerciseApi {
  create: typeof createAdminStarterExercise;
  update: typeof updateAdminStarterExercise;
  promote: typeof promoteAdminExercise;
}

const defaultApi: AdminExerciseApi = {
  create: createAdminStarterExercise,
  update: updateAdminStarterExercise,
  promote: promoteAdminExercise,
};

const COPY: Record<ExerciseDialogMode, { title: string; submit: string }> = {
  create: { title: "Novo exercício", submit: "Criar exercício" },
  edit: { title: "Editar exercício", submit: "Salvar" },
  promote: { title: "Promover ao catálogo", submit: "Adicionar ao catálogo" },
};

interface AdminExerciseDialogProps {
  mode: ExerciseDialogMode;
  /**
   * Required for `edit` (a starter exercise, the "Catálogo inicial" row) and `promote` (a
   * trainer's private exercise: the form starts as a copy of it); ignored for `create`.
   */
  exercise?: AdminCatalogExercise;
  onClose: () => void;
  /** Injected by stories (no BFF in Storybook); defaults to the real calls. */
  api?: AdminExerciseApi;
}

/**
 * The admin exercise form (pen.dev `Ef6Bz` new, `a5D2r` edit with a duplicate name, `I6NIe`
 * promote; PRD R52–R60, R64, E31–E33): create a starter exercise, replace one (the whole form is a
 * `PUT`), or add an edited copy of a trainer's exercise to the starter set. Same bounds as the
 * trainer's form (`exerciseSchema`). A duplicate name is a field error on "Nome" until the name
 * changes; any other failure stays in the dialog. One request per submit. On success: both
 * catalog lists and the history are invalidated (§9), a toast, closed.
 */
export function AdminExerciseDialog({ mode, exercise, onClose, api = defaultApi }: AdminExerciseDialogProps) {
  if (mode !== "create" && !exercise) throw new Error(`AdminExerciseDialog: "${mode}" needs an exercise`);
  const source = mode === "create" ? undefined : exercise;
  const copy = COPY[mode];
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The name the BFF refused as taken: the field error shows while the field still holds it.
  const [takenName, setTakenName] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const groups = useQuery({
    queryKey: adminKeys.muscleGroups(),
    queryFn: fetchMuscleGroups,
    staleTime: MUSCLE_GROUPS_STALE_TIME,
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    trigger,
    formState: { errors, isValid },
  } = useForm<ExerciseFormInput>({
    mode: "onChange",
    resolver: zodResolver(exerciseSchema),
    defaultValues: exerciseFormDefaults(source),
  });

  // A prefilled form is checked at once, so a value stored before today's rules (a non-YouTube
  // link) shows its error instead of a silently disabled submit.
  useEffect(() => {
    if (mode !== "create") void trigger();
  }, [mode, trigger]);

  const muscleGroupIds = useWatch({ control, name: "muscleGroupIds" });
  const name = useWatch({ control, name: "name" });
  const nameTaken = takenName !== null && name.trim() === takenName;

  function close() {
    if (!pending) onClose();
  }

  async function save(form: ExerciseFormInput) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPending(true);
    setError(null);
    const body = exerciseRequest(form);
    try {
      if (!source) await api.create(body);
      else if (mode === "edit") await api.update(source.id, body);
      else await api.promote(source.id, body);
    } catch (failure) {
      submittingRef.current = false;
      setPending(false);
      const outcome = exerciseSaveError(failure, mode);
      if (outcome.field === "name") setTakenName(body.name);
      else setError(outcome.message);
      return;
    }
    invalidateAfterExerciseWrite(queryClient);
    toast({ tone: "success", message: exerciseSavedMessage(mode, body.name) });
    onClose();
  }

  return (
    <Dialog title={copy.title} onClose={close} width={520}>
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(save)(event)}
        className="flex w-full flex-col gap-[var(--space-4)]"
      >
        {mode === "promote" && (
          <div className="flex items-start gap-[10px] rounded-[var(--radius-md)] bg-[#ffb0201a] px-[12px] py-[10px]">
            <Info aria-hidden="true" width={16} height={16} className="mt-[1px] shrink-0 text-[color:var(--color-warning)]" />
            <p className="text-[12px] leading-[1.5] text-[color:var(--color-warning)]">
              Uma cópia entra no Catálogo inicial e fica disponível para todos os treinadores. O exercício
              privado de {source?.owner?.name ?? "o treinador"} continua igual.
            </p>
          </div>
        )}
        <TextField
          label="Nome"
          placeholder="Ex.: Supino inclinado com halteres"
          error={errors.name?.message ?? (nameTaken ? "Já existe um exercício com esse nome" : undefined)}
          {...register("name")}
        />
        <div className="flex flex-col gap-[6px]">
          <MultiSelect
            label="Grupos musculares"
            placeholder={muscleGroupIds.length > 0 ? "Adicionar outro grupo" : "Selecione ao menos 1 grupo"}
            options={(groups.data ?? []).map((group) => ({ value: String(group.id), label: group.name }))}
            value={muscleGroupIds.map(String)}
            onChange={(ids) =>
              setValue("muscleGroupIds", ids.map(Number), { shouldValidate: true, shouldTouch: true })
            }
            disabled={!groups.isSuccess || pending}
            error={errors.muscleGroupIds?.message}
          />
          {groups.isError && (
            <p className="flex items-center gap-[6px] text-[11px]">
              <span className="text-[color:var(--color-danger)]">Não foi possível carregar os grupos musculares</span>
              <button
                type="button"
                onClick={() => void groups.refetch()}
                className="font-semibold text-[color:var(--color-primary)]"
              >
                Tentar novamente
              </button>
            </p>
          )}
        </div>
        <TextArea
          label="Descrição"
          placeholder="Como executar, cuidados e variações"
          error={errors.description?.message}
          {...register("description")}
        />
        <TextField
          label="Link do vídeo"
          placeholder="https://youtube.com/…"
          helpText="Opcional. Cole um link do YouTube."
          error={errors.videoUrl?.message}
          {...register("videoUrl")}
        />
        {error && (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-danger)]"
          >
            {error}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={close} disabled={pending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={pending}
            // Groups not loaded: the form can't be checked against them, so it can't be sent.
            disabled={pending || !isValid || nameTaken || !groups.isSuccess}
          >
            {copy.submit}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
