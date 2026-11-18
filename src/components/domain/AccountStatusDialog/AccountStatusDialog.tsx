"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, DialogFooter, TextArea, useToast } from "@/components/ui";
import {
  STATUS_ALREADY_CHANGED_MESSAGE,
  isStaleStatus,
  reasonFieldError,
  statusChangedMessage,
} from "@/lib/admin/account";
import { adminKeys } from "@/lib/api/admin";
import { reactivateAdminUser, suspendAdminUser } from "@/lib/api/adminAccount";
import { ApiError } from "@/lib/api/client";
import { apiErrorMessage, errorMessages } from "@/lib/api/errorMessages";
import type { AdminDirectoryRole } from "@/lib/api/types";
import { adminReasonSchema } from "@/lib/validation/admin";

export type AccountStatusAction = "suspend" | "reactivate";

export interface AccountStatusApi {
  suspend: typeof suspendAdminUser;
  reactivate: typeof reactivateAdminUser;
}

const defaultApi: AccountStatusApi = { suspend: suspendAdminUser, reactivate: reactivateAdminUser };

const COPY = {
  suspend: {
    title: (name: string) => `Suspender ${name}?`,
    body: (name: string, role: AdminDirectoryRole) =>
      `${name} não conseguirá entrar no Vertice enquanto a conta estiver suspensa. ${
        role === "TRAINER" ? "Os dados da conta e dos alunos são mantidos." : "Os dados da conta são mantidos."
      }`,
    placeholder: "Descreva por que esta conta está sendo suspensa",
    confirm: "Suspender",
    variant: "danger",
    failed: "Não foi possível suspender a conta. Tente novamente.",
  },
  reactivate: {
    title: (name: string) => `Reativar ${name}?`,
    body: (name: string) => `${name} volta a conseguir entrar no Vertice com a mesma senha.`,
    placeholder: "Descreva por que esta conta está sendo reativada",
    confirm: "Reativar",
    variant: "primary",
    failed: "Não foi possível reativar a conta. Tente novamente.",
  },
} as const;

interface AccountStatusDialogProps {
  action: AccountStatusAction;
  user: { id: number; name: string; role: AdminDirectoryRole };
  onClose: () => void;
  /** After the account changed (or turned out to have changed already): one profile `refetch()`. */
  onChanged: () => void;
  /** Injected by stories (no BFF in Storybook); defaults to the real calls. */
  api?: AccountStatusApi;
}

/**
 * Suspend or reactivate a trainer or client (pen.dev `oY0tG`/`mS7wU`, `HCHVB`/`GOUMA`; R39, R44,
 * E20, E23). The "Motivo" is required: the confirm button stays disabled until the trimmed reason
 * is non-empty, and the reason goes to the history. One request per confirm.
 *
 * After a success, and after a 409 `PRECONDITION_FAILED` (someone changed the status first) or a
 * 404 (the account is gone): invalidate the directory, the history and the suspension banner's
 * entry, refetch the profile once (`onChanged`), close and say so in a toast. Other failures stay
 * in the dialog.
 */
export function AccountStatusDialog({ action, user, onClose, onChanged, api = defaultApi }: AccountStatusDialogProps) {
  const copy = COPY[action];
  const queryClient = useQueryClient();
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const parsed = adminReasonSchema.safeParse(reason);

  function close() {
    if (!pending) onClose();
  }

  function settle(message: string, tone: "success" | "error") {
    void queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    // The history prefix also covers `adminKeys.suspension(id)`, the suspended banner's entry.
    void queryClient.invalidateQueries({ queryKey: adminKeys.actions() });
    onChanged();
    toast({ tone, message });
    onClose();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current || !parsed.success) return;
    submittingRef.current = true;
    setPending(true);
    setError(null);
    setFieldError(null);
    try {
      await api[action](user.id, parsed.data);
    } catch (failure) {
      if (isStaleStatus(failure)) {
        const gone = failure instanceof ApiError && failure.code === "NOT_FOUND";
        settle(gone ? errorMessages.NOT_FOUND! : STATUS_ALREADY_CHANGED_MESSAGE, "error");
        return;
      }
      submittingRef.current = false;
      setPending(false);
      const field = reasonFieldError(failure);
      if (field) setFieldError(field);
      else setError(apiErrorMessage(failure, copy.failed));
      return;
    }
    settle(statusChangedMessage(action, user.name), "success");
  }

  return (
    <Dialog title={copy.title(user.name)} onClose={close} width={480}>
      <form onSubmit={(event) => void submit(event)} className="flex w-full flex-col gap-[var(--space-4)]">
        <p className="text-[13px] leading-[1.55] text-[color:var(--color-text-secondary)]">
          {copy.body(user.name, user.role)}
        </p>
        <TextArea
          label="Motivo"
          required
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setFieldError(null);
          }}
          placeholder={copy.placeholder}
          helpText="Obrigatório. Fica registrado no Histórico."
          error={fieldError ?? (parsed.success || reason.trim() === "" ? undefined : parsed.error.issues[0]?.message)}
          disabled={pending}
        />
        {error && (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-danger)]"
          >
            {error}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={close} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" variant={copy.variant} loading={pending} disabled={pending || !parsed.success}>
            {copy.confirm}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
