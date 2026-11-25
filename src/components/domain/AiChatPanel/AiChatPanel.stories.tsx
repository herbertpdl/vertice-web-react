import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import type { ChatMessage, ChatState } from "@/lib/assistant/chat";
import {
  READY_MESSAGE,
  SAVE_FIRST_MESSAGE,
  STOPPED_MESSAGE,
  assistantErrorMessages,
} from "@/lib/assistant/copy";
import { AiChatPanel } from "./AiChatPanel";

function chat(messages: ChatMessage[], patch: Partial<ChatState> = {}): ChatState {
  return { messages, phase: "idle", input: "", answered: new Set(), ...patch };
}

const ask: ChatMessage = { id: "m1", turn: "t1", role: "user", kind: "text", text: "Quantas séries de supino para hipertrofia?" };
const change: ChatMessage = { id: "m1", turn: "t1", role: "user", kind: "text", text: "Adicione um finalizador para pernas" };

const meta = {
  component: AiChatPanel,
  args: {
    state: chat([]),
    onInput: fn(),
    onSend: fn(),
    onStop: fn(),
    onRetry: fn(),
    onClose: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ height: 720, display: "flex", justifyContent: "flex-end", transform: "translateZ(0)" }}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AiChatPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An empty conversation (frame `t1PsT`): disclaimer and character counter always under the input (R10, R11). */
export const Empty: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByText("Como posso ajudar com este treino?")).toBeVisible();
    await expect(canvas.getByText("0 / 2.000")).toBeVisible();
    await expect(canvas.getByLabelText("Mensagem para o assistente")).toHaveAccessibleDescription("0 / 2.000");
    await expect(getComputedStyle(canvas.getByLabelText("Mensagem para o assistente")).resize).toBe("vertical");
    await expect(canvas.getByText("A IA pode cometer erros. Revise antes de aplicar.")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Enviar" })).toBeDisabled();
    await expect(canvas.getByLabelText("Mensagem para o assistente")).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect(args.onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(canvas.getByRole("button", { name: "Fechar assistente" }));
    await expect(args.onClose).toHaveBeenCalledTimes(2);
  },
};

/** A question being answered word by word (frame `Q9EzR`): input locked, "Parar" instead of "Enviar" (R14, R15, R17). */
export const StreamingAnswer: Story = {
  args: {
    state: chat(
      [ask, { id: "m2", turn: "t1", role: "assistant", kind: "text", text: "Para hipertrofia, de 3 a 4 séries de 6 a 12 repetições" }],
      { phase: "answering" },
    ),
  },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByLabelText("Mensagem para o assistente")).toBeDisabled();
    await expect(canvas.queryByRole("button", { name: "Enviar" })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Parar" }));
    await expect(args.onStop).toHaveBeenCalled();
  },
};

/** A change being built (frame `ChSlt`): each stage as it happens (R18). */
export const BuildingStages: Story = {
  args: {
    state: chat(
      [
        change,
        {
          id: "m2",
          turn: "t1",
          role: "assistant",
          kind: "stages",
          stages: [
            { key: "analyzing", label: "Analisando o treino", done: true },
            { key: "choosing_exercises", label: "Escolhendo exercícios", done: false },
          ],
        },
      ],
      { phase: "building" },
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Escolhendo exercícios…")).toBeVisible();
    await expect(canvas.getByText("Analisando o treino")).toBeVisible();
  },
};

/** The proposal arrived (R26) and part of the request was left out (R51, E11a). */
export const ProposalReadyPartly: Story = {
  args: {
    state: chat([
      change,
      {
        id: "m2",
        turn: "t1",
        role: "assistant",
        kind: "stages",
        stages: [
          { key: "analyzing", label: "Analisando o treino", done: true },
          { key: "building_sets", label: "Montando séries", done: true },
        ],
      },
      { id: "m3", turn: "t1", role: "assistant", kind: "ready", text: READY_MESSAGE },
      { id: "m4", turn: "t1", role: "assistant", kind: "text", text: "Não há kettlebell no seu catálogo, então o swing ficou de fora." },
    ]),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(READY_MESSAGE)).toBeVisible();
  },
};

/** A failure offers "Tentar novamente" on the last error only (R21, R22; frames `H0aLE`, `y8qFL`). */
export const Errors: Story = {
  args: {
    state: chat([
      ask,
      { id: "m2", turn: "t1", role: "assistant", kind: "stopped", text: STOPPED_MESSAGE },
      change,
      { id: "m4", turn: "t2", role: "assistant", kind: "error", text: assistantErrorMessages.AI_INVALID_PROPOSAL, retryable: true },
    ]),
  },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByText(STOPPED_MESSAGE)).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Tentar novamente" }));
    await expect(args.onRetry).toHaveBeenCalled();
  },
};

/** The last save failed: nothing was sent and the message is back in the composer (R53, E29). */
export const SaveFirst: Story = {
  args: {
    state: chat([{ id: "m1", turn: "t1", role: "assistant", kind: "notice", text: SAVE_FIRST_MESSAGE }], {
      input: "Troque o supino por crucifixo",
    }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Mensagem para o assistente")).toHaveValue("Troque o supino por crucifixo");
    await expect(canvas.getByRole("button", { name: "Enviar" })).toBeEnabled();
  },
};

/** Over 2,000 characters: the counter shows the excess and sending is blocked (R10, E3; frame `Cz6l0`). */
export const OverTheLimit: Story = {
  args: { state: chat([], { input: "a".repeat(2500) }) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("2.500 / 2.000")).toBeVisible();
    await expect(canvas.getByText(/remova 500 caracteres/)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Enviar" })).toBeDisabled();
  },
};

/** R25, R28, E11 (frame `iIb3w`): the fixed line naming the client, "Ver anamnese" in a new browser tab. */
export const AnamnesePresent: Story = {
  args: { anamneseNotice: { state: "present", client: { id: 3, name: "Maria Silva" } } },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("A IA usa a anamnese de Maria Silva como referência para montar o treino."),
    ).toBeVisible();
    const link = canvas.getByRole("link", { name: /Ver anamnese/ });
    await expect(link).toHaveAttribute("href", "/alunos/3?aba=anamnese");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    // The chat works as before.
    await expect(canvas.getByText("Como posso ajudar com este treino?")).toBeVisible();
  },
};

/** R26, R27, E12 (frame `k1OeP5`): the notice with the fill-in link; the chat stays usable. */
export const AnamneseMissing: Story = {
  args: {
    anamneseNotice: { state: "missing", client: { id: 3, name: "Maria Silva" } },
    state: chat([], { input: "Oi" }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Maria Silva ainda não tem anamnese.")).toBeVisible();
    await expect(
      canvas.getByText(
        "Com a anamnese preenchida, a IA conhece a saúde e o histórico de treino do aluno e monta treinos melhores. Você pode usar o assistente mesmo sem ela.",
      ),
    ).toBeVisible();
    const link = canvas.getByRole("link", { name: /Preencher anamnese/ });
    await expect(link).toHaveAttribute("href", "/alunos/3?aba=anamnese");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(canvas.getByRole("button", { name: "Enviar" })).toBeEnabled();
  },
};

/** Q2: a former trainer's panel (`unavailable`) shows no strip and no link; neither does a pending or failed read. */
export const AnamneseUnavailable: Story = {
  args: { anamneseNotice: { state: "unavailable", client: null } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/anamnese/i)).toBeNull();
    await expect(canvas.queryByRole("link")).toBeNull();
  },
};

/** E25, R31 (frame `s0yr3`): the left-out line and the conflict line, separate, after the ready line. */
export const LeftOutAndConflict: Story = {
  args: {
    anamneseNotice: { state: "present", client: { id: 3, name: "Maria Silva" } },
    state: chat([
      { id: "m1", turn: "t1", role: "user", kind: "text", text: "Adicione box jump e burpee com salto ao treino, 3 séries de 8." },
      { id: "m2", turn: "t1", role: "assistant", kind: "ready", text: READY_MESSAGE },
      { id: "m3", turn: "t1", role: "assistant", kind: "left_out", text: "Não encontrei “Burpee com salto” no catálogo, por isso ficou de fora." },
      { id: "m4", turn: "t1", role: "assistant", kind: "conflict", text: "A anamnese diz “dor no joelho direito, evitar impacto”, e o box jump é um exercício de impacto." },
    ]),
  },
  play: async ({ canvas }) => {
    const leftOut = canvas.getByText("Não encontrei “Burpee com salto” no catálogo, por isso ficou de fora.");
    const conflict = canvas.getByText(
      "A anamnese diz “dor no joelho direito, evitar impacto”, e o box jump é um exercício de impacto.",
    );
    await expect(leftOut).toBeVisible();
    await expect(conflict).toBeVisible();
    // Two lines, in order, the conflict one marked with its warning icon.
    await expect(leftOut.compareDocumentPosition(conflict) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await expect(leftOut.parentElement).not.toBe(conflict.parentElement);
    await expect(canvas.getByRole("img", { name: "Conflito com a anamnese" })).toBeInTheDocument();
  },
};
