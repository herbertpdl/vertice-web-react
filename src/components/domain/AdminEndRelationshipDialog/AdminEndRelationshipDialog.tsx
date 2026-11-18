"use client";

import { Unlink } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui";
import { RELATIONSHIP_ALREADY_ENDED_MESSAGE, isRelationshipGone, relationshipEndedMessage } from "@/lib/admin/account";
import { adminKeys } from "@/lib/api/admin";
import { endAdminRelationship } from "@/lib/api/adminAccount";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { ConfirmDialog } from "../ConfirmDialog";

export interface AdminEndRelationshipApi {
  end: typeof endAdminRelationship;
}

const defaultApi: AdminEndRelationshipApi = { end: endAdminRelationship };

interface Person {
  id: number;
  name: string;
}

interface AdminEndRelationshipDialogProps {
  client: Person;
  trainer: Person;
  onClose: () => void;
  /** After the relationship ended (or had already ended): one profile `refetch()`. */
  onChanged: () => void;
  /** Injected by stories (no BFF in Storybook); defaults to the real call. */
  api?: AdminEndRelationshipApi;
}

/**
 * "Encerrar vínculo com treinador" on a client's profile (pen.dev `x81nY`; R50, E25,
 * `DELETE /admin/relationships/:trainerId/:clientId`, BFF B17). No reason is asked. The client's
 * account, plans and recorded training stay; the trainer moves to "Treinadores anteriores".
 *
 * A 404 or 403 means it already ended elsewhere: the dialog closes as after a success, with the
 * "já foi encerrado" toast instead. Either way the directory and the history are invalidated and
 * the profile is refetched once. Other failures stay in the dialog.
 */
export function AdminEndRelationshipDialog({
  client,
  trainer,
  onClose,
  onChanged,
  api = defaultApi,
}: AdminEndRelationshipDialogProps) {
  const queryClient = useQueryClient();
  const toast = useToast();

  async function end(): Promise<"ended" | "gone"> {
    try {
      await api.end(trainer.id, client.id);
      return "ended";
    } catch (failure) {
      if (isRelationshipGone(failure)) return "gone";
      throw failure;
    }
  }

  return (
    <ConfirmDialog
      title="Encerrar vínculo com o treinador?"
      confirmLabel="Encerrar vínculo"
      cancelVariant="ghost"
      width={480}
      onConfirm={end}
      errorMessage={(error) => apiErrorMessage(error, "Não foi possível encerrar o vínculo. Tente novamente.")}
      onDone={(result) => {
        void queryClient.invalidateQueries({ queryKey: adminKeys.users() });
        void queryClient.invalidateQueries({ queryKey: adminKeys.actions() });
        onChanged();
        toast(
          result === "ended"
            ? { tone: "success", message: relationshipEndedMessage(client.name, trainer.name) }
            : { tone: "error", message: RELATIONSHIP_ALREADY_ENDED_MESSAGE },
        );
        onClose();
      }}
      onClose={onClose}
    >
      <p className="text-[13px] leading-[1.55]">
        {client.name} deixa de ter {trainer.name} como treinador. Os planos e treinos já feitos continuam
        no histórico, e {trainer.name} passa para &ldquo;Treinadores anteriores&rdquo;.
      </p>
      <div className="flex w-full items-center gap-[12px] rounded-[var(--radius-md)] bg-[var(--color-bg)] px-[14px] py-[12px] text-[13px] font-semibold text-[color:var(--color-text-primary)]">
        <span className="min-w-0 truncate">{client.name}</span>
        <Unlink aria-hidden="true" width={16} height={16} className="shrink-0 text-[color:var(--color-danger)]" />
        <span className="min-w-0 truncate">{trainer.name}</span>
      </div>
    </ConfirmDialog>
  );
}
