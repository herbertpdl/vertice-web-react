"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Checkbox, TextField } from "@/components/ui";
import { register as registerTrainer } from "@/lib/api/auth";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { maskCpf } from "@/lib/masks/cpf";
import { onlyDigits } from "@/lib/validation/cpf";

export function RegisterForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      cpf: "",
      cref: "",
      password: "",
      confirmPassword: "",
      terms: false as unknown as true,
    },
  });

  const cpf = watch("cpf");
  const terms = watch("terms");
  const password = watch("password");
  const confirmPassword = watch("confirmPassword");
  const confirmMatches =
    confirmPassword.length > 0 && confirmPassword === password;

  async function onSubmit(data: RegisterInput) {
    setFormError(null);
    try {
      await registerTrainer({
        name: data.name,
        email: data.email,
        cpf: onlyDigits(data.cpf),
        cref: data.cref || undefined,
        password: data.password,
        remember: true,
      });
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível criar a conta";
      setFormError(message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-[400px] flex-col gap-[var(--space-5)]"
    >
      <div className="flex flex-col gap-[6px]">
        <h1 className="font-heading text-[length:var(--text-2xl)] font-bold text-[color:var(--color-text-primary)]">
          Crie sua conta de treinador
        </h1>
        <p className="text-[13px] leading-[1.5] text-[color:var(--color-text-secondary)]">
          Comece a montar planos e acompanhar seus alunos hoje mesmo.
        </p>
      </div>

      {formError && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-danger)]">
          {formError}
        </div>
      )}

      <div className="flex flex-col gap-[var(--space-4)]">
        <TextField
          label="Nome completo"
          placeholder="Ana Ribeiro"
          autoComplete="name"
          error={errors.name?.message}
          {...register("name")}
        />
        <TextField
          label="Email"
          type="email"
          placeholder="ana.ribeiro@email.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <div className="flex w-full gap-[var(--space-3)]">
          <TextField
            label="CPF"
            placeholder="123.456.789-09"
            inputMode="numeric"
            error={errors.cpf?.message}
            value={cpf}
            onChange={(event) => setValue("cpf", maskCpf(event.target.value))}
            className="flex-1"
          />
          <TextField
            label="CREF (opcional)"
            placeholder="012345-G/SP"
            error={errors.cref?.message}
            {...register("cref")}
            className="flex-1"
          />
        </div>
        <TextField
          label="Senha"
          type="password"
          placeholder="••••••••••"
          autoComplete="new-password"
          helpText="Mínimo de 6 caracteres."
          error={errors.password?.message}
          {...register("password")}
        />
        <TextField
          label="Confirmar senha"
          type="password"
          placeholder="••••••••••"
          autoComplete="new-password"
          helpText={confirmMatches ? "✓ As senhas coincidem" : undefined}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
      </div>

      <div className="flex w-full items-start gap-2">
        <Checkbox
          checked={terms === true}
          onChange={(event) => setValue("terms", event.target.checked as true)}
        />
        <span className="text-[12px] leading-[1.4] text-[color:var(--color-text-secondary)]">
          Concordo com os Termos de Uso e a Política de Privacidade
        </span>
      </div>
      {errors.terms && (
        <span className="-mt-3 text-[11px] text-[color:var(--color-danger)]">
          {errors.terms.message}
        </span>
      )}

      <Button type="submit" loading={isSubmitting} className="w-full justify-center">
        Criar conta
      </Button>

      <div className="flex w-full justify-center gap-1">
        <span className="text-[12px] text-[color:var(--color-text-secondary)]">
          Já tem uma conta?
        </span>
        <Link
          href="/login"
          className="text-[12px] font-semibold text-[color:var(--color-primary)]"
        >
          Entrar
        </Link>
      </div>
    </form>
  );
}
