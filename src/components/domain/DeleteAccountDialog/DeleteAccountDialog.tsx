"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button, Dialog, DialogFooter, TextField } from "@/components/ui";
import { deleteAccount, logout } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { rateLimitedMessage } from "@/lib/api/rateLimit";
import type { Role } from "@/lib/api/types";

/** What the user types to unlock "Excluir conta". */
export const DELETE_CONFIRMATION_PHRASE = "EXCLUIR";

/** Where the app goes once the account is gone: the login page, with the "conta excluída" notice. */
export const ACCOUNT_DELETED_URL = "/login?aviso=conta-excluida";

export interface DeleteAccountApi {
  deleteAccount: typeof deleteAccount;
  logout: typeof logout;
  /** A full-page navigation, so no query refetches with the dead session in between. */
  leave: (url: string) => void;
}

function leave(url: string) {
  window.location.assign(url);
}

const defaultApi: DeleteAccountApi = { deleteAccount, logout, leave };

interface DeleteAccountDialogProps {
  role: Role;
  onClose: () => void;
  /** Injected by stories (no BFF in Storybook); defaults to the real calls. */
  api?: DeleteAccountApi;
}

/**
 * "Excluir conta": the user types `EXCLUIR` and their current password, then `DELETE /auth/me`.
 * A wrong password is an inline error (the session is still valid); a trainer with active clients
 * is told to end each relationship first. On success the account's tokens are dead but the web's
 * session cookie is not cleared by the proxy, so this logs out and leaves for /login.
 */
export function DeleteAccountDialog({ role, onClose, api = defaultApi }: DeleteAccountDialogProps) {
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [activeClients, setActiveClients] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // `pending` is state: a second Enter in the same tick would still see it false.
  const submittingRef = useRef(false);
  // No closing while the delete is in flight. (`Dialog` reads the latest `onClose` itself.)
  function close() {
    if (!pending) onClose();
  }

  const confirmed = phrase.trim() === DELETE_CONFIRMATION_PHRASE;
  const canSubmit = confirmed && password.length > 0 && !pending;

  async function submit() {
    if (!canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setPending(true);
    setPasswordError(null);
    setActiveClients(false);
    setRootError(null);
    try {
      await api.deleteAccount(password);
    } catch (error) {
      submittingRef.current = false;
      setPending(false);
      if (error instanceof ApiError && error.code === "INVALID_CURRENT_PASSWORD") {
        setPasswordError("Senha incorreta");
      } else if (error instanceof ApiError && error.code === "ACTIVE_CLIENTS") {
        setActiveClients(true);
      } else {
        setRootError(
          rateLimitedMessage(error, "Muitas tentativas com senha incorreta.") ??
            apiErrorMessage(error, "Não foi possível excluir a conta. Tente novamente."),
        );
      }
      return;
    }
    // The account is gone: whatever happens to the logout call, leave the app (a cookie left
    // behind is refused with a 401 on the next call, which logs out anyway).
    try {
      await api.logout();
    } finally {
      api.leave(ACCOUNT_DELETED_URL);
    }
  }

  return (
    <Dialog title="Excluir conta?" onClose={close}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="flex w-full flex-col gap-[var(--space-4)]"
      >
        <p className="text-[length:var(--text-base)] leading-[1.5] text-[color:var(--color-text-secondary)]">
          Seus registros de treino, feedbacks e os planos feitos para você serão apagados, seus
          vínculos com treinadores e alunos serão encerrados e seus dados pessoais serão
          anonimizados.{" "}
          <span className="font-semibold text-[color:var(--color-text-primary)]">
            Esta ação não pode ser desfeita.
          </span>
        </p>
        {role === "TRAINER" && (
          <p className="text-[length:var(--text-sm)] leading-[1.5] text-[color:var(--color-text-secondary)]">
            Os planos que você escreveu para seus alunos continuam com eles.
          </p>
        )}

        {activeClients && (
          <div
            role="alert"
            className="flex w-full items-start gap-[var(--space-3)] rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[#ff5c5c14] p-[var(--space-4)]"
          >
            <TriangleAlert
              width={20}
              height={20}
              className="shrink-0 text-[color:var(--color-danger)]"
            />
            <div className="flex flex-1 flex-col gap-[4px]">
              <span className="font-heading text-[length:var(--text-md)] font-semibold text-[color:var(--color-danger)]">
                Você ainda tem alunos ativos
              </span>
              <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-primary)]">
                Encerre o acompanhamento de cada aluno antes de excluir sua conta.{" "}
                <Link href="/alunos" className="font-semibold text-[color:var(--color-primary)]">
                  Ver alunos
                </Link>
              </p>
            </div>
          </div>
        )}
        {rootError && (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-danger)]"
          >
            {rootError}
          </div>
        )}

        <TextField
          label={`Digite ${DELETE_CONFIRMATION_PHRASE} para confirmar`}
          autoComplete="off"
          spellCheck={false}
          value={phrase}
          onChange={(event) => setPhrase(event.target.value)}
        />
        <TextField
          label="Sua senha"
          type="password"
          autoComplete="current-password"
          value={password}
          error={passwordError ?? undefined}
          onChange={(event) => {
            setPassword(event.target.value);
            setPasswordError(null);
          }}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" loading={pending} disabled={!canSubmit}>
            Excluir conta
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
