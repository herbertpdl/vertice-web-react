"use client";

import { useRef, useState } from "react";
import { Button, Dialog, DialogFooter } from "@/components/ui";

interface ConfirmDialogProps {
  title: string;
  /** What happens, in plain words. */
  children: React.ReactNode;
  confirmLabel: string;
  /** `danger` for a delete, `primary` for a softer action. */
  confirmVariant?: "danger" | "primary";
  /** The call. Resolves on success; a rejection shows `errorMessage(error)` and keeps the dialog. */
  onConfirm: () => Promise<unknown>;
  /** pt-BR copy for a failed call, keyed on the error code by the caller. */
  errorMessage: (error: unknown) => string;
  /** After `onConfirm` resolved (navigate away, invalidate). The dialog does not close itself. */
  onDone: () => void;
  onClose: () => void;
}

/**
 * Asks before a destructive call and runs it once: Cancelar and Escape do nothing to the data, a
 * double click or a second Enter sends one request, and a failure stays in the dialog with its copy.
 */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  confirmVariant = "danger",
  onConfirm,
  errorMessage,
  onDone,
  onClose,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // `pending` is state: a second activation in the same tick would still see it false.
  const submittingRef = useRef(false);

  function close() {
    if (!pending) onClose();
  }

  async function confirm() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPending(true);
    setError(null);
    try {
      await onConfirm();
    } catch (failure) {
      submittingRef.current = false;
      setPending(false);
      setError(errorMessage(failure));
      return;
    }
    onDone();
  }

  return (
    <Dialog title={title} onClose={close}>
      <div className="flex w-full flex-col gap-[var(--space-4)]">
        <div className="flex flex-col gap-[var(--space-3)] text-[length:var(--text-base)] leading-[1.5] text-[color:var(--color-text-secondary)]">
          {children}
        </div>
        {error && (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-danger)]"
          >
            {error}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={pending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            loading={pending}
            // `loading` alone leaves the button keyboard-activatable.
            disabled={pending}
            onClick={() => void confirm()}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
