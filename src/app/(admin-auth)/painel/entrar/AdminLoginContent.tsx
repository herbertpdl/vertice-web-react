"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import QRCode from "qrcode";
import { ArrowLeft, CircleAlert, Copy, Timer } from "lucide-react";
import { Button, CodeInput, TextField } from "@/components/ui";
import { adminEnroll, adminLogin, adminLogout, adminVerify } from "@/lib/api/adminAuth";
import { signInFailure, type SignInFailure } from "@/lib/adminAuth/errors";
import {
  challengeExpired,
  initialSignInState,
  manualEntryKey,
  SESSION_EXPIRED_MESSAGE,
  SESSION_LIMITS_HELP,
  signInReducer,
} from "@/lib/adminAuth/signIn";
import { safeAdminRedirectPath } from "@/lib/safeRedirect";
import { adminLoginSchema, secondFactorCodeSchema, type AdminLoginInput } from "@/lib/validation/admin";

interface AdminLoginContentProps {
  /** `?motivo=expirou`: the session ended (frame `cb0r1`). */
  expired: boolean;
  /** `?redirect=`: where to land after the code (only `/painel` paths are honoured). */
  redirect: string | null;
}

/**
 * `/painel/entrar` (admin-panel spec W7, W10, §4): password, then authenticator enrolment (first
 * access only) or the code. The steps are a pure reducer (`src/lib/adminAuth/signIn.ts`) in
 * component state, so a reload starts at the password. One request per submit (a ref, as
 * `ConfirmDialog` does); a 429 keeps the submit disabled until `Retry-After` has passed.
 */
export function AdminLoginContent({ expired, redirect }: AdminLoginContentProps) {
  const [state, dispatch] = useReducer(signInReducer, expired, initialSignInState);
  const [formError, setFormError] = useState<string | null>(null);
  // A 429's wait, as its own object so the same number of seconds twice still re-arms the timer.
  const [lock, setLock] = useState<{ seconds: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [codeFormatError, setCodeFormatError] = useState<string | null>(null);
  const submitting = useRef(false);
  const enrollSeq = useRef(0);

  // A UI wait, not a session timer: re-enable the submit once Retry-After has passed.
  useEffect(() => {
    if (lock === null) return;
    const timer = window.setTimeout(() => setLock(null), lock.seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [lock]);
  const locked = lock !== null;

  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors },
  } = useForm<AdminLoginInput>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  function showFailure(failure: Extract<SignInFailure, { kind: "message" }>) {
    setFormError(failure.message);
    if (failure.retryAfter && failure.retryAfter > 0) setLock({ seconds: failure.retryAfter });
  }

  function restart() {
    setCode("");
    setCodeFormatError(null);
    resetField("password");
    dispatch({ type: "challengeEnded" });
  }

  /** Each call mints a new secret (BFF B14): called only from an event, and only the latest answer counts. */
  async function startEnroll() {
    const request = ++enrollSeq.current;
    dispatch({ type: "enrollStarted", request });
    try {
      const { provisioningUri } = await adminEnroll();
      dispatch({ type: "enrolled", request, provisioningUri });
    } catch (error) {
      if (request !== enrollSeq.current) return;
      const failure = signInFailure(error, "enroll");
      if (failure.kind === "alreadyEnrolled") dispatch({ type: "alreadyEnrolled", request });
      else if (failure.kind === "challengeEnded") restart();
      else {
        dispatch({ type: "enrollFailed", request });
        if (failure.kind === "message") showFailure(failure);
      }
    }
  }

  async function onPassword(data: AdminLoginInput) {
    if (submitting.current || locked) return;
    submitting.current = true;
    setBusy(true);
    setFormError(null);
    try {
      const { secondFactor, challengeDeadline } = await adminLogin(data);
      setCode("");
      dispatch({ type: "loggedIn", secondFactor, challengeDeadline });
      if (secondFactor === "NOT_ENROLLED") void startEnroll();
    } catch (error) {
      const failure = signInFailure(error, "login");
      if (failure.kind === "message") showFailure(failure);
      resetField("password");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function onCode(event: React.FormEvent) {
    event.preventDefault();
    if (state.step === "password" || submitting.current || locked) return;
    if (challengeExpired(state.challengeDeadline)) {
      restart();
      return;
    }
    if (!secondFactorCodeSchema.safeParse(code).success) {
      setCodeFormatError("Digite os 6 dígitos do código");
      return;
    }
    submitting.current = true;
    setBusy(true);
    setFormError(null);
    try {
      await adminVerify(code);
      // A hard navigation: the server layout reads the new cookie and checks the role (W4).
      window.location.assign(safeAdminRedirectPath(redirect, window.location.origin));
      return;
    } catch (error) {
      const failure = signInFailure(error, "verify");
      if (failure.kind === "codeRejected") dispatch({ type: "codeRejected" });
      else if (failure.kind === "challengeEnded") restart();
      else if (failure.kind === "message") showFailure(failure);
    }
    submitting.current = false;
    setBusy(false);
  }

  async function backToPassword() {
    await adminLogout();
    setCode("");
    setCodeFormatError(null);
    setFormError(null);
    resetField("password");
    dispatch({ type: "backToPassword" });
  }

  function onCodeChange(value: string) {
    setCode(value);
    setCodeFormatError(null);
    dispatch({ type: "codeEdited" });
  }

  const codeError = state.step === "password" ? undefined : (state.codeError ?? codeFormatError ?? undefined);

  return (
    <div className="font-base flex w-full max-w-[400px] flex-col gap-[var(--space-6)]">
      {state.step === "password" && (
        <form onSubmit={(event) => void handleSubmit(onPassword)(event)} noValidate className="flex flex-col gap-[var(--space-6)]">
          <Heading title="Entrar no painel" subtitle="Use o e-mail e a senha da sua conta de administrador." />
          {formError ? (
            <ErrorBanner message={formError} />
          ) : (
            state.expired && <ExpiredNotice />
          )}
          <div className="flex flex-col gap-[var(--space-4)]">
            <TextField
              label="E-mail"
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
          <Button type="submit" loading={busy} disabled={locked} className="w-full justify-center">
            Entrar
          </Button>
          {state.expired && (
            <p className="text-[12px] leading-[1.5] text-[color:var(--color-text-tertiary)]">{SESSION_LIMITS_HELP}</p>
          )}
        </form>
      )}

      {state.step === "enroll" && (
        <form onSubmit={(event) => void onCode(event)} noValidate className="flex flex-col gap-[var(--space-6)]">
          <Heading
            title="Configure a verificação em duas etapas"
            subtitle="Obrigatória para administradores. Faça isso uma única vez, no primeiro acesso."
          />
          {formError && <ErrorBanner message={formError} />}
          <div className="flex w-full flex-col items-center gap-[20px] sm:flex-row">
            <EnrollmentQr uri={state.provisioningUri} />
            <div className="flex w-full flex-col gap-[10px]">
              <p className="text-[13px] leading-[1.5] text-[color:var(--color-text-secondary)]">
                1. Escaneie o QR code com um app autenticador (Google Authenticator, 1Password, Authy).
              </p>
              {state.provisioningUri && <ManualKey uri={state.provisioningUri} />}
              {state.enrollFailed && (
                <p className="text-[12px] text-[color:var(--color-danger)]">
                  Não foi possível gerar o QR code.{" "}
                  <button
                    type="button"
                    onClick={() => void startEnroll()}
                    disabled={locked}
                    className="font-semibold text-[color:var(--color-primary)] disabled:opacity-35"
                  >
                    Gerar novo QR
                  </button>
                </p>
              )}
            </div>
          </div>
          <p className="text-[13px] leading-[1.5] text-[color:var(--color-text-secondary)]">
            2. Digite o código que aparece no app para confirmar.
          </p>
          <CodeInput value={code} onChange={onCodeChange} error={codeError} autoFocus />
          <Button
            type="submit"
            loading={busy}
            disabled={locked || !state.provisioningUri}
            className="w-full justify-center"
          >
            Ativar e entrar
          </Button>
          <BackLink onClick={() => void backToPassword()} />
        </form>
      )}

      {state.step === "code" && (
        <form onSubmit={(event) => void onCode(event)} noValidate className="flex flex-col gap-[var(--space-6)]">
          <Heading title="Verificação em duas etapas" subtitle="Digite o código de 6 dígitos do seu app autenticador." />
          {formError && <ErrorBanner message={formError} />}
          <CodeInput value={code} onChange={onCodeChange} error={codeError} autoFocus />
          <Button type="submit" loading={busy} disabled={locked} className="w-full justify-center">
            Verificar
          </Button>
          <BackLink onClick={() => void backToPassword()} />
        </form>
      )}
    </div>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <h1 className="font-heading text-[length:var(--text-2xl)] font-bold text-[color:var(--color-text-primary)]">
        {title}
      </h1>
      <p className="text-[13px] leading-[1.5] text-[color:var(--color-text-secondary)]">{subtitle}</p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-[10px] rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] leading-[1.5] text-[color:var(--color-danger)]"
    >
      <CircleAlert aria-hidden="true" className="h-[16px] w-[16px] shrink-0" />
      {message}
    </div>
  );
}

function ExpiredNotice() {
  return (
    <div
      role="status"
      className="flex items-center gap-[10px] rounded-[var(--radius-md)] border border-[var(--color-info)] bg-[var(--color-info)]/10 px-[14px] py-[10px] text-[13px] leading-[1.5] text-[color:var(--color-info)]"
    >
      <Timer aria-hidden="true" className="h-[16px] w-[16px] shrink-0" />
      {SESSION_EXPIRED_MESSAGE}
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-[6px] text-[12px] font-semibold text-[color:var(--color-primary)]"
    >
      <ArrowLeft aria-hidden="true" className="h-[14px] w-[14px]" />
      Voltar para o login
    </button>
  );
}

/** The QR, drawn in this process from the URI (never by a third-party service, BFF B14). */
function EnrollmentQr({ uri }: { uri?: string }) {
  const [drawn, setDrawn] = useState<{ uri: string; svg: string } | null>(null);

  useEffect(() => {
    if (!uri) return;
    let current = true;
    QRCode.toString(uri, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
      .then((svg) => current && setDrawn({ uri, svg }))
      .catch(() => current && setDrawn(null));
    return () => {
      current = false;
    };
  }, [uri]);

  // Only the QR of the URI on screen: a replaced secret's QR is never left showing.
  const svg = drawn && drawn.uri === uri ? drawn.svg : null;
  return (
    <div className="flex h-[148px] w-[148px] shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-white p-[12px]">
      {svg ? (
        // A data: URI (the CSP allows `img-src data:`), never injected markup.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
          alt="QR code para configurar o app autenticador"
          width={124}
          height={124}
        />
      ) : (
        <span className="text-[12px] text-[#0A0E14]">Gerando…</span>
      )}
    </div>
  );
}

function ManualKey({ uri }: { uri: string }) {
  const key = manualEntryKey(uri);
  const [copied, setCopied] = useState(false);
  if (!key) return null;
  return (
    <div className="flex flex-col gap-[10px]">
      <span className="text-[12px] text-[color:var(--color-text-tertiary)]">Não consegue escanear? Digite a chave:</span>
      <div className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[10px] py-[8px]">
        <code className="font-mono text-[12px] font-semibold tracking-[0.5px] text-[color:var(--color-text-primary)]">{key}</code>
        <button
          type="button"
          aria-label={copied ? "Chave copiada" : "Copiar chave"}
          title={copied ? "Copiada" : "Copiar"}
          onClick={() => {
            void navigator.clipboard
              ?.writeText(key.replace(/\s/g, ""))
              .then(() => setCopied(true))
              .catch(() => undefined);
          }}
          className="text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-primary)]"
        >
          <Copy aria-hidden="true" className="h-[14px] w-[14px]" />
        </button>
      </div>
    </div>
  );
}
