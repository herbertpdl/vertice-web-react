import type { AssistantErrorCode, AssistantStage } from "./contract";

/** pt-BR label per stage key: the web shows these, never the model's own text (assessment §8). */
export const stageLabels: Record<AssistantStage, string> = {
  analyzing: "Analisando o treino",
  choosing_exercises: "Escolhendo exercícios",
  building_sets: "Montando séries",
  checking: "Conferindo o treino",
};

/** A stage key this build does not know yet (a BFF deployed ahead): still a visible step. */
export const UNKNOWN_STAGE_LABEL = "Trabalhando no treino";

export function stageLabel(stage: string, exercise?: number): string {
  const label = Object.hasOwn(stageLabels, stage) ? stageLabels[stage as AssistantStage] : UNKNOWN_STAGE_LABEL;
  return exercise ? `${label} do ${exercise}º exercício` : label;
}

export const STOPPED_MESSAGE = "Interrompido. O treino não foi alterado.";
export const READY_MESSAGE = "Proposta pronta para revisão no editor.";
export const DISCLAIMER = "A IA pode cometer erros. Revise antes de aplicar.";
export const SAVE_FIRST_MESSAGE =
  "Salve o treino antes de enviar: use “Tentar novamente” no rodapé. Sua mensagem continua no campo.";
export const EDITS_REPLACED_MESSAGE =
  "Você editou o treino enquanto a IA respondia; a proposta foi montada sobre a versão enviada e substituiu essas edições. Refaça-as se precisar.";
export const REVIEW_STATUS = "Proposta em revisão — ainda não salva";

/** Copy per error code the assistant's stream (or its route) can answer. */
export const assistantErrorMessages: Record<AssistantErrorCode, string> = {
  AI_ERROR: "Não foi possível responder. Tente novamente.",
  AI_INVALID_PROPOSAL: "Não consegui montar o treino. Tente novamente ou reformule o pedido.",
  AI_TIMEOUT: "A IA demorou demais para responder. Tente novamente.",
  AI_UNAVAILABLE: "O assistente está indisponível no momento. Tente novamente em instantes.",
  AI_SUPERSEDED: STOPPED_MESSAGE,
  AI_CATALOG_TOO_LARGE:
    "Seu catálogo passou do limite que o assistente consegue considerar (1.000 exercícios). Fale com o suporte.",
};

export function assistantErrorMessage(code: string): string {
  return Object.hasOwn(assistantErrorMessages, code)
    ? assistantErrorMessages[code as AssistantErrorCode]
    : assistantErrorMessages.AI_ERROR;
}

export const LEAVE_WHILE_BUSY_MESSAGE =
  "A IA ainda está trabalhando. Sair mesmo assim? O progresso do assistente será perdido.";
export const LEAVE_WITH_PROPOSAL_MESSAGE =
  "A proposta da IA ainda não foi aplicada. Sair mesmo assim? Ela será descartada.";
