"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Checkbox, TextField } from "@/components/ui";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { rateLimitedMessage } from "@/lib/api/rateLimit";
import { safeRedirectPath } from "@/lib/safeRedirect";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
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

      {formError && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-danger)]">
          {formError}
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

      {/* "Esqueceu a senha?" comes back with password reset (audit plan P1-06). */}
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
  const rateLimited = rateLimitedMessage(error);
  if (rateLimited) return rateLimited;
  if (error instanceof ApiError && error.status === 401) return "E-mail ou senha inválidos";
  return error instanceof Error ? error.message : "Não foi possível entrar";
}
