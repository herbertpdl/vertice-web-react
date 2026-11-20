"use client";

import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { flagSaveErrorMessage, isFlagGone } from "@/lib/admin/featureFlags";
import { setFeatureFlagEveryone } from "@/lib/api/adminFeatureFlags";

/** What a confirm ended in: saved, or the flag was removed (E9). */
export type EveryoneOutcome = { gone: boolean };

interface FeatureFlagEveryoneDialogProps {
  flagKey: string;
  /** The state captured when the switch was clicked (D5): the copy and the body, whatever refetches. */
  target: boolean;
  /**
   * After the save (or a 404): the caller settles the list (`settleAfterWrite`) before resolving,
   * so the button keeps loading until the list shows the saved state (D4).
   */
  onSaved: (outcome: EveryoneOutcome) => Promise<void>;
  /** The save started (`true`) or failed (`false`): the switch behind the dialog is pending meanwhile (§6.1). */
  onPending?: (pending: boolean) => void;
  onDone: (outcome: EveryoneOutcome) => void;
  onClose: () => void;
}

/**
 * "Ligar para todos?" / "Desligar para todos?" (feature-flags spec §2, D6; frames `pGJVX`, `q1Y3N`,
 * `vBk8U`), shared by the list and the detail header. Sends `{ enabled: target }` once on confirm;
 * Cancelar and Escape send nothing. A `NOT_FOUND` resolves as `{ gone: true }` so the caller closes
 * with the "flag gone" toast; any other failure stays in the dialog with the generic copy.
 */
export function FeatureFlagEveryoneDialog({
  flagKey,
  target,
  onSaved,
  onPending,
  onDone,
  onClose,
}: FeatureFlagEveryoneDialogProps) {
  async function confirm(): Promise<EveryoneOutcome> {
    let outcome: EveryoneOutcome;
    onPending?.(true);
    try {
      await setFeatureFlagEveryone(flagKey, target);
      outcome = { gone: false };
    } catch (failure) {
      if (!isFlagGone(failure)) {
        onPending?.(false);
        throw failure;
      }
      outcome = { gone: true };
    }
    await onSaved(outcome);
    return outcome;
  }

  const word = target ? "ligada" : "desligada";
  return (
    <ConfirmDialog
      title={target ? "Ligar para todos?" : "Desligar para todos?"}
      confirmLabel={target ? "Ligar para todos" : "Desligar para todos"}
      confirmVariant={target ? "primary" : "danger"}
      cancelVariant="ghost"
      width={480}
      onConfirm={confirm}
      errorMessage={flagSaveErrorMessage}
      onDone={onDone}
      onClose={onClose}
    >
      <p>
        A flag <FlagKey>{flagKey}</FlagKey> ficará {word} para todos os usuários sem configuração própria. A mudança
        vale em até 1 minuto.
      </p>
    </ConfirmDialog>
  );
}

/** A flag key as the frames set it: monospace, shown as sent, never translated (D2). */
export function FlagKey({ children, className = "" }: { children: string; className?: string }) {
  return (
    <code className={`font-mono font-semibold break-all text-[color:var(--color-text-primary)] ${className}`}>{children}</code>
  );
}
