import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { QueryClient } from "@tanstack/react-query";
import { expect, fn, waitFor } from "storybook/test";
import { AnamneseTab } from "./AnamneseTab";
import { SAVED_AT, anamneseServer, installAnamneseServer, savedText, savesSent } from "./anamneseStoryServer";
import { withSeededQueries } from "@/components/domain/storyQuery";

const KEY = '["student",42,"anamnese"]';
const AI_ON = { '["assistantStatus"]': { enabled: true } };
const empty = { [KEY]: { text: "", updatedAt: null }, ...AI_ON };
const saved = { [KEY]: { text: savedText, updatedAt: SAVED_AT }, ...AI_ON };

let client: QueryClient;
const onDirtyChange = fn();

const meta = {
  component: AnamneseTab,
  args: { clientId: 42, clientName: "Marina Costa", onDirtyChange },
  parameters: { layout: "fullscreen" },
  beforeEach: () => {
    onDirtyChange.mockClear();
    return installAnamneseServer();
  },
} satisfies Meta<typeof AnamneseTab>;

export default meta;
type Story = StoryObj<typeof meta>;

const AI_SENTENCE = "O Assistente IA lê este texto quando monta ou altera os treinos de Marina.";

/** E1, R16, R17, F9: empty box, explanation, topics, no "Atualizada em"; "Salvar" off until a change. */
export const Empty: Story = {
  decorators: [withSeededQueries(empty)],
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Anamnese de Marina Costa")).toHaveValue("");
    await expect(canvas.getByPlaceholderText(/^Escreva aqui o que você sabe sobre Marina\. Por exemplo:/)).toBeInTheDocument();
    await expect(canvas.getByText("0 / 5.000")).toBeVisible();
    await expect(canvas.queryByText(/Atualizada em/)).toBeNull();
    await expect(canvas.getByRole("button", { name: "Salvar" })).toBeDisabled();
    await expect(canvas.getByText(AI_SENTENCE)).toBeVisible();
    await expect(
      canvas.getByText(
        "Só você vê no app. Marina não vê este texto no aplicativo, mas pode recebê-lo se pedir uma cópia dos seus dados.",
      ),
    ).toBeVisible();
    for (const topic of ["Objetivo", "Histórico de saúde", "Lesões e dores", "Medicamentos", "Limitações", "Rotina e disponibilidade", "Experiência com treino"]) {
      await expect(canvas.getByText(topic)).toBeVisible();
    }
  },
};

/** R39, E21: with the assistant off the explanation never mentions it. */
export const AssistantOff: Story = {
  decorators: [withSeededQueries({ [KEY]: { text: "", updatedAt: null }, '["assistantStatus"]': { enabled: false } })],
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Para que serve a anamnese")).toBeVisible();
    await expect(canvas.queryByText(AI_SENTENCE)).toBeNull();
  },
};

/** R39: while the assistant's status is unknown (pending), the sentence stays hidden. */
export const AssistantStatusPending: Story = {
  decorators: [withSeededQueries({ [KEY]: { text: "", updatedAt: null } }, { pending: ['["assistantStatus"]'] })],
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Para que serve a anamnese")).toBeVisible();
    await expect(canvas.queryByText(AI_SENTENCE)).toBeNull();
  },
};

/** R14: a saved anamnese shows its text and the date of the last save. */
export const Saved: Story = {
  decorators: [withSeededQueries(saved)],
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Anamnese de Marina Costa")).toHaveValue(savedText);
    await expect(canvas.getByText("Atualizada em 20/11/2026")).toBeVisible();
    await expect(canvas.queryByText("Alterações não salvas")).toBeNull();
    await expect(canvas.getByRole("button", { name: "Salvar" })).toBeDisabled();
  },
};

/** R12, R14, E4: nothing is saved until "Salvar"; the text goes as typed, then "Atualizada em" follows. */
export const EditAndSave: Story = {
  decorators: [withSeededQueries(saved)],
  play: async ({ canvas, userEvent }) => {
    const box = canvas.getByLabelText("Anamnese de Marina Costa");
    await userEvent.click(box);
    await userEvent.type(box, "\n25/11: dor lombar leve.  ");
    await expect(canvas.getByText("Alterações não salvas")).toBeVisible();
    await expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    await expect(savesSent()).toEqual([]);
    await userEvent.click(canvas.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(canvas.getByText("Atualizada em 25/11/2026")).toBeVisible());
    await expect(savesSent()).toEqual([`${savedText}\n25/11: dor lombar leve.  `]);
    await expect(canvas.queryByText("Alterações não salvas")).toBeNull();
    await expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  },
};

/** R19, E5: clearing the text and saving brings the empty state back. */
export const BlankSave: Story = {
  decorators: [withSeededQueries(saved)],
  play: async ({ canvas, userEvent }) => {
    const box = canvas.getByLabelText("Anamnese de Marina Costa");
    await userEvent.clear(box);
    await userEvent.type(box, "   ");
    await userEvent.click(canvas.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(canvas.queryByText(/Atualizada em/)).toBeNull());
    await expect(box).toHaveValue("");
    await expect(canvas.getByText("0 / 5.000")).toBeVisible();
  },
};

/** R11, E2: a 6,000-character paste stays whole; the counter shows the excess and "Salvar" is blocked. */
export const OverLimitPaste: Story = {
  decorators: [withSeededQueries(empty)],
  play: async ({ canvas, userEvent }) => {
    const box = canvas.getByLabelText("Anamnese de Marina Costa");
    await userEvent.click(box);
    await userEvent.paste("a".repeat(6000));
    await expect((box as HTMLTextAreaElement).value).toHaveLength(6000);
    await expect(canvas.getByText("6.000 / 5.000")).toBeVisible();
    await expect(canvas.getByText("O texto passou do limite. Apague 1.000 caracteres para poder salvar.")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Salvar" })).toBeDisabled();
    await expect(box).toHaveAttribute("aria-invalid", "true");
  },
};

/** F5, spec D2: a refetch never overwrites a dirty draft, and is adopted while clean. */
export const RefetchKeepsDraft: Story = {
  decorators: [withSeededQueries(saved, { onClient: (seeded) => (client = seeded) })],
  play: async ({ canvas, userEvent }) => {
    const box = canvas.getByLabelText("Anamnese de Marina Costa");
    await userEvent.type(box, " editando");
    client.setQueryData(["student", 42, "anamnese"], { text: "De outra aba", updatedAt: "2026-11-24T15:00:00Z" });
    await expect(box).toHaveValue(`${savedText} editando`);
    await expect(canvas.getByText("Atualizada em 20/11/2026")).toBeVisible();
  },
};

/** Clean draft: a newer read from another tab is shown (E6's last-wins outcome). */
export const RefetchAdoptedWhenClean: Story = {
  decorators: [withSeededQueries(saved, { onClient: (seeded) => (client = seeded) })],
  play: async ({ canvas }) => {
    client.setQueryData(["student", 42, "anamnese"], { text: "De outra aba", updatedAt: "2026-11-24T15:00:00Z" });
    await waitFor(() => expect(canvas.getByLabelText("Anamnese de Marina Costa")).toHaveValue("De outra aba"));
    await expect(canvas.getByText("Atualizada em 24/11/2026")).toBeVisible();
  },
};

/** Frame `jKyn1`: while saving the text is read-only and the button says "Salvando…". */
export const Saving: Story = {
  decorators: [withSeededQueries(saved)],
  play: async ({ canvas, userEvent }) => {
    anamneseServer.answer = "hold";
    const box = canvas.getByLabelText("Anamnese de Marina Costa");
    await userEvent.type(box, " mais");
    await userEvent.click(canvas.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(canvas.getByRole("button", { name: /Salvando…/ })).toBeVisible());
    await expect(box).toHaveAttribute("readonly");
  },
};

/** Frame `ZgCb4`, R12: a failed save keeps the text, inline, with a retry. */
export const SaveError: Story = {
  decorators: [withSeededQueries(saved)],
  play: async ({ canvas, userEvent }) => {
    anamneseServer.answer = "fail";
    const box = canvas.getByLabelText("Anamnese de Marina Costa");
    await userEvent.type(box, " mais");
    await userEvent.click(canvas.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(canvas.getByText("Não foi possível salvar a anamnese. Seu texto continua aqui.")).toBeVisible(),
    );
    await expect(box).toHaveValue(`${savedText} mais`);
    await expect(canvas.getByText("Alterações não salvas")).toBeVisible();
    anamneseServer.answer = "ok";
    await userEvent.click(canvas.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(canvas.getByText("Atualizada em 25/11/2026")).toBeVisible());
  },
};

/** R7, F13: the relationship ended mid-edit; the text stays, no redirect, no retry. */
export const SaveForbidden: Story = {
  decorators: [withSeededQueries(saved)],
  play: async ({ canvas, userEvent }) => {
    anamneseServer.answer = "forbidden";
    const box = canvas.getByLabelText("Anamnese de Marina Costa");
    await userEvent.type(box, " mais");
    await userEvent.click(canvas.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(canvas.getByText("Você não acompanha mais este aluno. Seu texto continua aqui.")).toBeVisible(),
    );
    await expect(box).toHaveValue(`${savedText} mais`);
    await expect(canvas.queryByRole("button", { name: "Tentar novamente" })).toBeNull();
  },
};

/** Frame `o5L6n`: skeletons while the first read is pending; the guide is already there. */
export const Loading: Story = {
  decorators: [withSeededQueries(AI_ON, { pending: [KEY] })],
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Carregando a anamnese")).toBeVisible();
    await expect(canvas.queryByRole("textbox")).toBeNull();
    await expect(canvas.getByText("O que escrever")).toBeVisible();
  },
};

/** Frame `w43OJl`: a failed read offers "Tentar novamente". */
export const LoadError: Story = {
  decorators: [withSeededQueries(AI_ON, { failing: [KEY] })],
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Não foi possível carregar a anamnese")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
    await expect(canvas.queryByRole("textbox")).toBeNull();
  },
};
