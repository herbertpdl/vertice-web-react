"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, DialogFooter, TextField } from "@/components/ui";
import { createStudent, issueStudentSetupToken } from "@/lib/api/students";
import type { CreatedStudent } from "@/lib/api/types";
import { studentSchema, type StudentInput } from "@/lib/validation/students";
import { maskCpf } from "@/lib/masks/cpf";
import { onlyDigits } from "@/lib/validation/cpf";
import { ApiError } from "@/lib/api/client";
import { apiErrorMessage, errorMessages } from "@/lib/api/errorMessages";
import { StudentAccessLink } from "../StudentAccessLink";

export interface NewStudentDialogApi {
  create: typeof createStudent;
  issueToken: typeof issueStudentSetupToken;
}

const defaultApi: NewStudentDialogApi = {
  create: createStudent,
  issueToken: issueStudentSetupToken,
};

export function NewStudentDialog({
  onClose,
  api = defaultApi,
}: {
  onClose: () => void;
  /** Injectable for stories (no BFF in Storybook); defaults to the real API calls. */
  api?: NewStudentDialogApi;
}) {
  const queryClient = useQueryClient();
  // Once created, the dialog shows the client's first-access link instead of the form.
  const [created, setCreated] = useState<CreatedStudent | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<StudentInput>({
    resolver: zodResolver(studentSchema),
    defaultValues: { name: "", email: "", cpf: "" },
  });

  const cpf = useWatch({ control, name: "cpf" });

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof createStudent>[0]) => api.create(input),
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setCreated(student);
    },
    onError: (error) => {
      // The BFF answers a taken email and a taken CPF alike, so the copy names both.
      if (error instanceof ApiError && error.code === "CONFLICT") {
        setError("email", { message: errorMessages.CONFLICT });
        return;
      }
      setError("root", { message: apiErrorMessage(error, "Não foi possível criar o aluno") });
    },
  });

  if (created) {
    return (
      <Dialog title="Aluno criado" onClose={onClose}>
        <div className="flex w-full flex-col gap-[var(--space-4)]">
          <p className="text-[13px] leading-[1.5] text-[color:var(--color-text-secondary)]">
            {created.setup
              ? `Envie este link para ${created.name} definir a senha de acesso.`
              : `${created.name} foi criado, mas o link de acesso não foi gerado.`}
          </p>
          <StudentAccessLink
            studentId={created.id}
            setup={created.setup}
            issueToken={api.issueToken}
          />
          <DialogFooter>
            <Button type="button" onClick={onClose}>
              Concluir
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog title="Novo aluno" onClose={onClose}>
      <form
        onSubmit={handleSubmit((data) => mutation.mutate({ ...data, cpf: onlyDigits(data.cpf) }))}
        className="flex w-full flex-col gap-[var(--space-4)]"
      >
        {errors.root && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-danger)]">
            {errors.root.message}
          </div>
        )}
        <TextField
          label="Nome completo"
          placeholder="Nome do aluno"
          error={errors.name?.message}
          {...register("name")}
        />
        <TextField
          label="Email"
          type="email"
          placeholder="aluno@email.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="CPF"
          placeholder="123.456.789-09"
          inputMode="numeric"
          error={errors.cpf?.message}
          value={cpf}
          onChange={(event) => setValue("cpf", maskCpf(event.target.value))}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Criar aluno
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
