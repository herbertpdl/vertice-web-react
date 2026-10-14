"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
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
const MISSING_TOKEN_MESSAGE = "Link incompleto — abra o link completo enviado pelo seu treinador.";

/** Where the token survives a reload of this tab once it's gone from the URL. */
export const SETUP_TOKEN_STORAGE_KEY = "vertice:setup-token";

function readStoredToken(): string {
  try {
    return window.sessionStorage.getItem(SETUP_TOKEN_STORAGE_KEY) ?? "";
  } catch {
    return ""; // storage disabled
  }
}

function storeToken(token: string | null) {
  try {
    if (token) window.sessionStorage.setItem(SETUP_TOKEN_STORAGE_KEY, token);
    else window.sessionStorage.removeItem(SETUP_TOKEN_STORAGE_KEY);
  } catch {
    // storage disabled: a reload then shows the "link incompleto" message
  }
}

export function SetPasswordForm({
  token: tokenFromUrl,
  submit = setupPassword,
}: {
  token: string;
  /** Injectable for stories (no BFF in Storybook); defaults to the real API call. */
  submit?: typeof setupPassword;
}) {
  // `undefined` until the mount effect has looked in sessionStorage (no flash of "incompleto").
  const [token, setToken] = useState<string | undefined>(tokenFromUrl || undefined);
  const [done, setDone] = useState(false);
  const [tokenRejected, setTokenRejected] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // The token is a live credential: drop it from the address bar (history, screenshots, shoulder
  // surfing) once the page has it. It moves to sessionStorage, so a reload of this tab (mobile
  // browsers reload backgrounded tabs, e.g. while the user is in a password manager) still has
  // it instead of reporting a working link as invalid. Native replaceState syncs with the App
  // Router without a navigation.
  useEffect(() => {
    if (tokenFromUrl) {
      storeToken(tokenFromUrl);
      const url = new URL(window.location.href);
      if (url.searchParams.has("token")) {
        url.searchParams.delete("token");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }
    } else {
      // Reading storage after hydration: the server can't know it.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only value (sessionStorage), can't be known during SSR
      setToken(readStoredToken());
    }
  }, [tokenFromUrl]);

  const tokenMissing = token === "";
  const linkUnusable = tokenMissing || tokenRejected;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const newPassword = useWatch({ control, name: "newPassword" });
  const confirmPassword = useWatch({ control, name: "confirmPassword" });
  const confirmMatches = confirmPassword.length > 0 && confirmPassword === newPassword;

  async function onSubmit(data: SetPasswordInput) {
    setFormError(null);
    try {
      await submit({ token: token!, newPassword: data.newPassword });
      storeToken(null);
      setDone(true);
    } catch (error) {
      if (error instanceof ApiError && error.code === "INVALID_SETUP_TOKEN") {
        storeToken(null);
        setTokenRejected(true);
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

      {(linkUnusable || formError) && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-danger)]"
        >
          {tokenRejected ? INVALID_LINK_MESSAGE : tokenMissing ? MISSING_TOKEN_MESSAGE : formError}
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
          disabled={token === undefined || linkUnusable}
          {...register("newPassword")}
        />
        <TextField
          label="Confirmar senha"
          type="password"
          placeholder="••••••••••"
          autoComplete="new-password"
          helpText={confirmMatches ? "✓ As senhas coincidem" : undefined}
          error={errors.confirmPassword?.message}
          disabled={token === undefined || linkUnusable}
          {...register("confirmPassword")}
        />
      </div>

      <Button
        type="submit"
        loading={isSubmitting}
        disabled={token === undefined || linkUnusable}
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
