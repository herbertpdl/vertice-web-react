"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { endStudentRelationship } from "@/lib/api/students";
import { ConfirmDialog } from "../ConfirmDialog";

export interface EndRelationshipApi {
  end: typeof endStudentRelationship;
}

const defaultApi: EndRelationshipApi = { end: endStudentRelationship };

function errorMessage(error: unknown) {
  // 403: not (or no longer) one of the trainer's clients, e.g. ended from another tab.
  if (error instanceof ApiError && error.code === "FORBIDDEN") {
    return "O acompanhamento deste aluno já foi encerrado.";
  }
  return apiErrorMessage(error, "Não foi possível encerrar o acompanhamento. Tente novamente.");
}

interface EndRelationshipDialogProps {
  student: { id: number; name: string };
  onClose: () => void;
  /** After the 204: the page leaves for the roster. */
  onEnded: () => void;
  /** Injected by stories (no BFF in Storybook); defaults to the real call. */
  api?: EndRelationshipApi;
}

/**
 * "Encerrar acompanhamento" (`DELETE /clients/:id`): ends the trainer's link with the client. The
 * client's account and the plans (with what they recorded) stay; only the trainer's access goes.
 */
export function EndRelationshipDialog({
  student,
  onClose,
  onEnded,
  api = defaultApi,
}: EndRelationshipDialogProps) {
  const queryClient = useQueryClient();

  return (
    <ConfirmDialog
      title="Encerrar acompanhamento?"
      confirmLabel="Encerrar acompanhamento"
      onConfirm={() => api.end(student.id)}
      errorMessage={errorMessage}
      onDone={() => {
        // The roster drops the client and the trainer loses the detail: refetch the lists, and
        // leave the student's own queries to be dropped once the page has gone.
        queryClient.invalidateQueries({ queryKey: ["students"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["student", student.id], refetchType: "none" });
        onEnded();
      }}
      onClose={onClose}
    >
      <p>
        <span className="font-semibold text-[color:var(--color-text-primary)]">{student.name}</span>{" "}
        sai da sua lista de alunos, e você deixa de ver o progresso e de criar planos para essa pessoa.
      </p>
      <p>
        A conta do aluno não é excluída: os planos que você criou e os treinos registrados nele
        continuam guardados, e o aluno pode ser acompanhado por outro treinador.
      </p>
    </ConfirmDialog>
  );
}
