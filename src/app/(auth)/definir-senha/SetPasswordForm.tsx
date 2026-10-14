"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, TextField } from "@/components/ui";
import { setupPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { rateLimitedMessage } from "@/lib/api/rateLimit";
import {
  PASSWORD_HELP_TEXT,
  setPasswordSchema,
  type SetPasswordInput,
} from "@/lib/validation/auth";

const INVALID_LINK_MESSAGE = "Link inválido ou expirado — peça um novo ao seu treinador.";

export function SetPasswordForm({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(token === "");
  const [formError, setFormError] = useState<string | null>(null);

  // The token is a live credential: drop it from the address bar (history, screenshots, shoulder
  // surfing) once the page has it. Native replaceState syncs with the App Router without a
  // navigation, so this server-rendered `token` prop is kept.
  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const newPassword = watch("newPassword");
  const confirmPassword = watch("confirmPassword");
  const confirmMatches = confirmPassword.length > 0 && confirmPassword === newPassword;

  async function onSubmit(data: SetPasswordInput) {
    setFormError(null);
    try {
      await setupPassword({ token, newPassword: data.newPassword });
      setDone(true);
    } catch (error) {
      if (error instanceof ApiError && error.code === "INVALID_SETUP_TOKEN") {
        setLinkInvalid(true);
      } else {
        setFormError(
          rateLimitedMessage(error) ?? "Não foi possível definir a senha. Tente novamente.",
        );
      }
    }
  }

  if (done) {
    return (
      <div className="flex w-full max-w-[380px] flex-col gap-[var(--space-6)]">
        <div className="flex flex-col gap-[6px]">
          <h1 className="font-heading text-[length:var(--text-2xl)] font-bold text-[color:var(--color-text-primary)]">
            Senha definida
          </h1>
          <p className="text-[13px] leading-[1.5] text-[color:var(--color-text-secondary)]">
            Pronto! Agora você já pode entrar com seu e-mail e a nova senha.
          </p>
        </div>
        <Link
          href="/login"
          className="text-[12px] font-semibold text-[color:var(--color-primary)]"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-[380px] flex-col gap-[var(--space-6)]"
    >
      <div className="flex flex-col gap-[6px]">
        <h1 className="font-heading text-[length:var(--text-2xl)] font-bold text-[color:var(--color-text-primary)]">
          Defina sua senha
        </h1>
        <p className="text-[13px] leading-[1.5] text-[color:var(--color-text-secondary)]">
          Escolha a senha que você vai usar para entrar na Vertice.
        </p>
      </div>

      {(linkInvalid || formError) && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-danger)]"
        >
          {linkInvalid ? INVALID_LINK_MESSAGE : formError}
        </div>
      )}

      <div className="flex flex-col gap-[var(--space-4)]">
        <TextField
          label="Nova senha"
          type="password"
          placeholder="••••••••••"
          autoComplete="new-password"
          helpText={PASSWORD_HELP_TEXT}
          error={errors.newPassword?.message}
          disabled={linkInvalid}
          {...register("newPassword")}
        />
        <TextField
          label="Confirmar senha"
          type="password"
          placeholder="••••••••••"
          autoComplete="new-password"
          helpText={confirmMatches ? "✓ As senhas coincidem" : undefined}
          error={errors.confirmPassword?.message}
          disabled={linkInvalid}
          {...register("confirmPassword")}
        />
      </div>

      <Button
        type="submit"
        loading={isSubmitting}
        disabled={linkInvalid}
        className="w-full justify-center"
      >
        Definir senha
      </Button>

      <div className="flex w-full justify-center gap-1">
        <span className="text-[12px] text-[color:var(--color-text-secondary)]">
          Já definiu sua senha?
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
