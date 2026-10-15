"use client";

import { useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Checkbox, Dialog, DialogFooter, TextField } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { apiErrorMessage, errorMessages } from "@/lib/api/errorMessages";
import { updateStudent, type UpdateStudentInput } from "@/lib/api/students";
import type { ClientDetail } from "@/lib/api/types";
import { maskCpf } from "@/lib/masks/cpf";
import {
  editStudentBody,
  editStudentDefaults,
  editStudentSchema,
  type EditStudentInput,
} from "@/lib/validation/students";

export interface EditStudentApi {
  update: typeof updateStudent;
}

const defaultApi: EditStudentApi = { update: updateStudent };

interface EditStudentDialogProps {
  /** As `GET /clients/:id` (or the overview) returns it: the CPF is masked, display only. */
  student: ClientDetail;
  onClose: () => void;
  /** Injected by stories (no BFF in Storybook); defaults to the real call. */
  api?: EditStudentApi;
}

/**
 * "Editar aluno" (`PATCH /clients/:id`): name, email and CPF. Clients have no CREF. The CPF field
 * starts empty and the masked one is only shown as a hint: left empty, the stored CPF stays.
 */
export function EditStudentDialog({ student, onClose, api = defaultApi }: EditStudentDialogProps) {
  const queryClient = useQueryClient();
  // `isPending` only shows up a render later: a second Enter in between would send twice.
  const submittingRef = useRef(false);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<EditStudentInput>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: editStudentDefaults(student),
  });
  const newCpf = useWatch({ control, name: "newCpf" });
  const removeCpf = useWatch({ control, name: "removeCpf" });

  const save = useMutation({
    mutationFn: (body: UpdateStudentInput) => api.update(student.id, body),
    onSettled: () => {
      submittingRef.current = false;
    },
    onSuccess: () => {
      // The detail, the overview, the roster row and the names on the dashboard.
      queryClient.invalidateQueries({ queryKey: ["student", student.id] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["recentWorkouts"] });
      onClose();
    },
    onError: (error) => {
      // A taken email and a taken CPF are the same 409, so the copy names both.
      if (error instanceof ApiError && error.code === "CONFLICT") {
        setError("email", { message: errorMessages.CONFLICT });
        return;
      }
      setError("root", { message: apiErrorMessage(error, "Não foi possível salvar o aluno") });
    },
  });

  function close() {
    if (!save.isPending) onClose();
  }

  function submit(values: EditStudentInput) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    save.mutate(editStudentBody(values));
  }

  return (
    <Dialog title="Editar aluno" onClose={close}>
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(submit)(event)}
        className="flex w-full flex-col gap-[var(--space-4)]"
      >
        {errors.root && (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-danger)]"
          >
            {errors.root.message}
          </div>
        )}
        <TextField label="Nome completo" error={errors.name?.message} {...register("name")} />
        <TextField
          label="Email"
          type="email"
          helpText="O aluno passa a entrar com o novo e-mail."
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Novo CPF"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          helpText={
            student.cpf
              ? `CPF cadastrado: ${student.cpf}. Deixe em branco para mantê-lo.`
              : "Nenhum CPF cadastrado."
          }
          disabled={removeCpf}
          error={errors.newCpf?.message}
          value={removeCpf ? "" : newCpf}
          onChange={(event) =>
            setValue("newCpf", maskCpf(event.target.value), { shouldValidate: true })
          }
        />
        {student.cpf && (
          <Checkbox
            id="edit-student-remove-cpf"
            label="Remover o CPF cadastrado"
            checked={removeCpf}
            onChange={(event) => {
              setValue("removeCpf", event.target.checked);
              if (event.target.checked) setValue("newCpf", "", { shouldValidate: true });
            }}
          />
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={save.isPending} disabled={save.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
