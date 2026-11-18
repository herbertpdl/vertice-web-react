"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button, Dialog, DialogFooter, TextField } from "@/components/ui";
import { changePassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { rateLimitedMessage } from "@/lib/api/rateLimit";
import { changePasswordSchema, PASSWORD_HELP_TEXT, type ChangePasswordInput } from "@/lib/validation/auth";

interface ChangePasswordDialogProps {
  onClose: () => void;
  /** After a change: every session of the account has ended, this one too (sign out here). */
  onChanged: () => void;
  /** Injected by stories (no BFF in Storybook); defaults to the real call. */
  submit?: typeof changePassword;
}

/**
 * "Alterar senha" (PRD admin-panel R16a, E42): the current password, then the new one twice,
 * `POST /auth/password`. The trainer's change-password pattern (vertice-mobile's screen: same
 * fields, copy and outcomes). A wrong current password is a field error, not a sign-out. A
 * successful change ends every session of the account, so the caller signs out at once.
 */
export function ChangePasswordDialog({ onClose, onChanged, submit = changePassword }: ChangePasswordDialogProps) {
  const [rootError, setRootError] = useState<string | null>(null);
  // `isPending` is state: a second Enter in the same tick would still see it false.
  const submittingRef = useRef(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const save = useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) => submit(input),
    // The passwords are this mutation's variables: drop them from the cache once it settles.
    gcTime: 0,
  });
  const pending = save.isPending;

  function close() {
    if (!pending) onClose();
  }

  async function onSubmit({ currentPassword, newPassword }: ChangePasswordInput) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setRootError(null);
    try {
      await save.mutateAsync({ currentPassword, newPassword });
    } catch (error) {
      submittingRef.current = false;
      if (error instanceof ApiError && error.code === "INVALID_CURRENT_PASSWORD") {
        setError("currentPassword", { message: "Senha atual incorreta." }, { shouldFocus: true });
      } else {
        setRootError(
          rateLimitedMessage(error, "Muitas tentativas.") ??
            apiErrorMessage(error, "Não foi possível alterar a senha"),
        );
      }
      return;
    }
    onChanged();
  }

  return (
    <Dialog title="Alterar senha" onClose={close}>
      <form
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        noValidate
        className="flex w-full flex-col gap-[var(--space-4)]"
      >
        <p className="text-[length:var(--text-base)] leading-[1.5] text-[color:var(--color-text-secondary)]">
          Ao salvar, você sai do painel em todos os aparelhos e entra de novo com a nova senha e o
          código do app autenticador.
        </p>
        {rootError && (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-danger)]"
          >
            {rootError}
          </div>
        )}
        <TextField
          label="Senha atual"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register("currentPassword")}
        />
        <TextField
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          helpText={PASSWORD_HELP_TEXT}
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <TextField
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" loading={pending}>
            Salvar nova senha
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
