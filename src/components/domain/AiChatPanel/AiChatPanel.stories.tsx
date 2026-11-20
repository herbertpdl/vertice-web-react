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

/** An empty conversation (frame `t1PsT`): disclaimer always under the input (R11). */
export const Empty: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByText("Como posso ajudar com este treino?")).toBeVisible();
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
