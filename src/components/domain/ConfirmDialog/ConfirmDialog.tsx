"use client";

import { useRef, useState } from "react";
import { Button, Dialog, DialogFooter } from "@/components/ui";

interface ConfirmDialogProps<T> {
  title: string;
  /** What happens, in plain words. */
  children: React.ReactNode;
  confirmLabel: string;
  /** `danger` for a delete, `primary` for a softer action. */
  confirmVariant?: "danger" | "primary";
  /** "Cancelar"'s look: `outline` (default) or `ghost` (the admin frames, e.g. `x81nY`). */
  cancelVariant?: "outline" | "ghost";
  /** Dialog width in px (`Dialog`'s default when absent). */
  width?: number;
  /**
   * The call. Resolves on success (with what `onDone` receives); a rejection shows
   * `errorMessage(error)` and keeps the dialog.
   */
  onConfirm: () => Promise<T>;
  /** pt-BR copy for a failed call, keyed on the error code by the caller. */
  errorMessage: (error: unknown) => string;
  /** After `onConfirm` resolved, with its result (navigate away, invalidate). The dialog does not close itself. */
  onDone: (result: T) => void;
  onClose: () => void;
}

/**
 * Asks before a destructive call and runs it once: Cancelar and Escape do nothing to the data, a
 * double click or a second Enter sends one request, and a failure stays in the dialog with its copy.
 */
export function ConfirmDialog<T>({
  title,
  children,
  confirmLabel,
  confirmVariant = "danger",
  cancelVariant = "outline",
  width,
  onConfirm,
  errorMessage,
  onDone,
  onClose,
}: ConfirmDialogProps<T>) {
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
    let result: T;
    try {
      result = await onConfirm();
    } catch (failure) {
      submittingRef.current = false;
      setPending(false);
      setError(errorMessage(failure));
      return;
    }
    onDone(result);
  }

  return (
    <Dialog title={title} onClose={close} width={width}>
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
          <Button type="button" variant={cancelVariant} onClick={close} disabled={pending}>
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
