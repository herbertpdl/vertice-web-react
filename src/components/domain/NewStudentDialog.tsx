"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, DialogFooter, TextField } from "@/components/ui";
import { createStudent } from "@/lib/api/students";
import { studentSchema, type StudentInput } from "@/lib/validation/students";
import { maskCpf } from "@/lib/masks/cpf";
import { onlyDigits } from "@/lib/validation/cpf";
import { ApiError } from "@/lib/api/client";

export function NewStudentDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<StudentInput>({
    resolver: zodResolver(studentSchema),
    defaultValues: { name: "", email: "", cpf: "" },
  });

  const cpf = watch("cpf");

  const mutation = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "CONFLICT") {
        setError("email", { message: "Já existe um aluno com este e-mail ou CPF" });
        return;
      }
      setError("root", {
        message: error instanceof Error ? error.message : "Não foi possível criar o aluno",
      });
    },
  });

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
