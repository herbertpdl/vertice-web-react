"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Checkbox, TextField } from "@/components/ui";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { APP_ONLY_MESSAGE, TRAINERS_ONLY_CODE } from "@/lib/auth/trainerOnly";
import { safeRedirectPath } from "@/lib/safeRedirect";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  // Set by "Excluir conta" (DeleteAccountDialog) once the account is gone and the session cleared.
  const accountDeleted = searchParams.get("aviso") === "conta-excluida";
  // Set by the app's gate when a client's (or admin's) session reaches a trainer page (R7).
  const appOnly = searchParams.get("motivo") === "app";

  const {
    register,
    handleSubmit,
    control,
    setValue,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const remember = useWatch({ control, name: "remember" });

  async function onSubmit(data: LoginInput) {
    setFormError(null);
    try {
      await login(data);
      setIsRedirecting(true);
      // `?redirect=` is attacker-controllable: only a same-origin path, else /dashboard.
      router.push(safeRedirectPath(searchParams.get("redirect"), window.location.origin));
      router.refresh();
    } catch (error) {
      setFormError(loginErrorMessage(error));
      // The e-mail stays; a refused client starts over in the app anyway.
      if (error instanceof ApiError && error.code === TRAINERS_ONLY_CODE) resetField("password");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-[380px] flex-col gap-[var(--space-6)]"
    >
      <div className="flex flex-col gap-[6px]">
        <h1 className="font-heading text-[length:var(--text-2xl)] font-bold text-[color:var(--color-text-primary)]">
          Bem-vindo de volta
        </h1>
        <p className="text-[13px] leading-[1.5] text-[color:var(--color-text-secondary)]">
          Entre na sua conta para continuar gerenciando seus alunos.
        </p>
      </div>

      {accountDeleted && !formError && (
        <div
          role="status"
          className="rounded-[var(--radius-md)] border border-[var(--color-success)] bg-[var(--color-success)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-success)]"
        >
          Sua conta foi excluída.
        </div>
      )}

      {(formError ?? (appOnly ? APP_ONLY_MESSAGE : null)) && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-danger)]"
        >
          {formError ?? APP_ONLY_MESSAGE}
        </div>
      )}

      <div className="flex flex-col gap-[var(--space-4)]">
        <TextField
          label="Email"
          type="email"
          placeholder="seu@email.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Senha"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
      </div>

      {/* No "Esqueceu a senha?" until a reset flow exists: it needs email delivery, which the stack
          does not have yet (follow-up from audit plan P1-06). */}
      <div className="flex w-full items-center justify-between">
        <Checkbox
          label="Manter-me conectado"
          checked={remember}
          onChange={(event) => setValue("remember", event.target.checked)}
        />
      </div>

      <Button
        type="submit"
        loading={isSubmitting || isRedirecting}
        className="w-full justify-center"
      >
        Entrar
      </Button>

      <div className="flex w-full justify-center gap-1">
        <span className="text-[12px] text-[color:var(--color-text-secondary)]">
          Não tem uma conta?
        </span>
        <Link
          href="/cadastro"
          className="text-[12px] font-semibold text-[color:var(--color-primary)]"
        >
          Criar conta
        </Link>
      </div>
    </form>
  );
}

function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) return "E-mail ou senha inválidos";
  if (error instanceof ApiError && error.code === TRAINERS_ONLY_CODE) return APP_ONLY_MESSAGE;
  return apiErrorMessage(error, "Não foi possível entrar");
}
