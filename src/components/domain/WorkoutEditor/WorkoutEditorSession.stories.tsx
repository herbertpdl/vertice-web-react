import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor, within } from "storybook/test";
import { WorkoutEditorSession, type WorkoutEditorSessionProps } from "./WorkoutEditor";
import { agachamentoCard, catalog, fakeTransport, puxadaCard, recentWorkouts, supinoCard } from "../storyFixtures";
import { withSeededQueries } from "../storyQuery";
import { emptyWorkout } from "@/lib/workoutEditor/model";

const meta = {
  component: WorkoutEditorSession,
  args: {
    planId: 7,
    workoutId: null,
    initial: emptyWorkout("MONDAY"),
    planName: "Hipertrofia — Fase 1",
    clientId: 3,
    studentName: "Maria Silva",
    transport: fakeTransport(),
    delayMs: 300,
  },
  decorators: [
    withSeededQueries({ '["exercises"]': catalog, '["recentWorkouts"]': recentWorkouts }),
    (Story) => (
      <div style={{ width: 1600, margin: -24 }}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
} satisfies Meta<typeof WorkoutEditorSession>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A workout that does not exist yet: the offer is there, the footer is idle (R1, R24). */
export const NewEmpty: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("As alterações são salvas automaticamente")).toBeVisible();
    await expect(
      canvas.getAllByRole("button", { name: "Usar treino existente como base" }),
    ).toHaveLength(2);
    await expect(canvas.getByText("Este treino ainda não tem exercícios")).toBeVisible();
  },
};

/** Adding the first exercise creates the workout silently and removes the offer (R3, R4, R24). */
export const FirstExerciseCreatesIt: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getAllByRole("button", { name: "+ Adicionar exercício" })[0]);
    await userEvent.click(canvas.getByRole("button", { name: "Adicionar Puxada Alta na Polia" }));
    await expect(canvas.getByText("Puxada Alta na Polia")).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "Usar treino existente como base" }),
    ).not.toBeInTheDocument();
    await expect(canvas.getByText("Salvando…")).toBeVisible();
    await waitFor(() => expect(canvas.getByText("Salvo")).toBeVisible(), { timeout: 3000 });
    await expect(canvas.getByText("Novo treino")).toBeVisible();
  },
};

/** An existing workout with exercises: no offer, "Salvo" after an edit (R7, R9). */
export const Existing: Story = {
  args: {
    workoutId: 42,
    initial: {
      name: "Treino A — Peito e Costas",
      dayOfWeek: "MONDAY",
      exercises: [supinoCard, puxadaCard, agachamentoCard],
    },
  },
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.queryByRole("button", { name: "Usar treino existente como base" }),
    ).not.toBeInTheDocument();
    await expect(canvas.getAllByRole("group")).toHaveLength(3);
    await userEvent.type(canvas.getByLabelText("Nome do treino"), " v2");
    await expect(canvas.getByText("Salvando…")).toBeVisible();
    await waitFor(() => expect(canvas.getByText("Salvo")).toBeVisible(), { timeout: 3000 });
  },
};

/** The exercise cap: hint, counter and a disabled add button (R21, E5). */
export const ExerciseCapReached: Story = {
  args: {
    workoutId: 42,
    initial: {
      name: "Treino cheio",
      dayOfWeek: "MONDAY",
      exercises: Array.from({ length: 20 }, (_, i) => ({ ...supinoCard, key: `cap${i}`, id: 500 + i, sets: [] })),
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("20 / 20 exercícios")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "+ Adicionar exercício" })).toBeDisabled();
  },
};

const treinoA = {
  name: "Treino A — Peito e Costas",
  dayOfWeek: "MONDAY",
  exercises: [supinoCard, puxadaCard, agachamentoCard],
} satisfies WorkoutEditorSessionProps["initial"];

const recordedData = fakeTransport({ refuseReplace: true });

/**
 * A client has recorded data under this workout: the first whole-list replace
 * comes back 409, the same change goes through the per-item endpoints, and
 * later edits skip the replace altogether (E14).
 */
export const RecordedDataFallsBackToPerItem: Story = {
  args: { workoutId: 42, initial: treinoA, transport: recordedData },
  play: async ({ canvas, userEvent }) => {
    recordedData.calls.length = 0;
    const agachamento = canvas.getByRole("group", { name: "Exercício 3: Agachamento Livre" });
    await userEvent.click(within(agachamento).getByRole("button", { name: "+ Adicionar série" }));
    await expect(canvas.getByText("Salvando…")).toBeVisible();
    await waitFor(() => expect(canvas.getByText("Salvo")).toBeVisible(), { timeout: 5000 });
    await expect(recordedData.calls).toEqual(["replace", "addSet"]);
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();

    await userEvent.click(within(agachamento).getByRole("button", { name: "+ Adicionar série" }));
    await waitFor(() => expect(canvas.getByText("Salvo")).toBeVisible(), { timeout: 5000 });
    await expect(recordedData.calls).toEqual(["replace", "addSet", "addSet"]);
  },
};

const protectedSet = fakeTransport({ refuseReplace: true, protectedSetIds: [101] });

/**
 * Removing a set a client already performed: the replace is refused, the
 * per-item delete is refused too, so the set comes back named in the banner
 * and flagged on its row while the footer still settles on "Salvo" (R27, E13).
 */
export const ProtectedSetRemovalRestored: Story = {
  args: { workoutId: 42, initial: treinoA, transport: protectedSet },
  play: async ({ canvas, userEvent }) => {
    protectedSet.calls.length = 0;
    const supino = canvas.getByRole("group", { name: "Exercício 1: Supino Reto com Barra" });
    await userEvent.click(within(supino).getByRole("button", { name: "Remover série 1" }));
    await expect(within(supino).getAllByRole("row")).toHaveLength(3);

    const banner = await canvas.findByRole("alert", undefined, { timeout: 5000 });
    await expect(within(banner).getByText("Remoção não aplicada")).toBeVisible();
    await expect(banner).toHaveTextContent("Supino Reto com Barra · Série 1");
    await expect(within(supino).getAllByRole("row")).toHaveLength(4);
    await expect(
      within(supino).getByText("Remoção desfeita — desempenho registrado por um aluno"),
    ).toBeVisible();
    await waitFor(() => expect(canvas.getByText("Salvo")).toBeVisible(), { timeout: 5000 });
    await expect(protectedSet.calls).toEqual(["replace", "deleteSet"]);

    await userEvent.click(canvas.getByRole("button", { name: "Fechar" }));
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};
