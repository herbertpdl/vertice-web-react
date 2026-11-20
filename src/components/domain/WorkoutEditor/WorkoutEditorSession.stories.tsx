import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect, fn, waitFor, within } from "storybook/test";
import { WorkoutEditorSession, type WorkoutEditorSessionProps } from "./WorkoutEditor";
import {
  agachamentoCard,
  exercisePages,
  fakeTransport,
  muscleGroups,
  puxada,
  puxadaCard,
  recentWorkouts,
  supinoCard,
  treinoAFull,
} from "../storyFixtures";
import { withSeededQueries } from "../storyQuery";
import { emptyWorkout } from "@/lib/workoutEditor/model";
import { exercisesQueryKey } from "@/lib/api/exercises";
import { muscleGroupsQueryKey } from "@/lib/api/muscleGroups";
import type { StreamWorkoutChat } from "@/lib/api/assistant";

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
    withSeededQueries({
      // What the picker gets for "pux" (it loads nothing before 3 letters).
      [JSON.stringify(exercisesQueryKey({ q: "pux" }))]: exercisePages([puxada]),
      [JSON.stringify(muscleGroupsQueryKey)]: muscleGroups,
      '["recentWorkouts"]': recentWorkouts,
      '["workout",42,"full"]': treinoAFull,
    }),
    (Story) => (
      <div style={{ width: 1600, margin: -24 }}>
        <Story />
      </div>
    ),
  ],
  // Not `nextjs: { appDirectory: true }`: Storybook 10.6's app-router decorator provides a
  // LayoutRouterContext without the `parentRenderTree` that Next 16.4's `useRouter` reads, so
  // every story crashed with "Cannot read properties of undefined (reading 'data')". The default
  // (pages-router) decorator plus a stubbed `next/navigation` `useRouter` is enough here: the
  // editor only calls `router.push` on "Concluir". Go back to `appDirectory` once Storybook's
  // mock catches up with Next 16.4.
  parameters: { layout: "fullscreen" },
  beforeEach: () => {
    useRouter.mockReturnValue({
      back: fn(),
      forward: fn(),
      refresh: fn(),
      hmrRefresh: fn(),
      push: fn(),
      replace: fn(),
      prefetch: fn(),
    } as unknown as ReturnType<typeof useRouter>);
  },
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
    await userEvent.type(canvas.getByLabelText("Buscar exercício por nome"), "pux");
    await userEvent.click(await canvas.findByRole("button", { name: "Adicionar Puxada Alta na Polia" }));
    await expect(canvas.getByText("Puxada Alta na Polia")).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "Usar treino existente como base" }),
    ).not.toBeInTheDocument();
    await expect(canvas.getByText("Salvando…")).toBeVisible();
    await waitFor(() => expect(canvas.getByText("Salvo")).toBeVisible(), { timeout: 3000 });
    await expect(canvas.getByText("Novo treino")).toBeVisible();
  },
};

/** "Usar treino existente como base": the pick seeds name, weekday and tree, then the first save creates the workout (R25, R3). */
export const CloneFromExisting: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getAllByRole("button", { name: "Usar treino existente como base" })[0]);
    const dialog = canvas.getByRole("dialog");
    await userEvent.click(within(dialog).getByText("Treino A — Peito e Costas"));
    await waitFor(() => expect(canvas.queryByRole("dialog")).not.toBeInTheDocument());
    await expect(canvas.getByLabelText("Nome do treino")).toHaveValue("Treino A — Peito e Costas");
    await expect(canvas.getAllByRole("group")).toHaveLength(3);
    await expect(
      within(canvas.getByRole("group", { name: "Exercício 1: Supino Reto com Barra" })).getAllByRole("row"),
    ).toHaveLength(4);
    await expect(
      canvas.queryByRole("button", { name: "Usar treino existente como base" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(canvas.getByText("Salvo")).toBeVisible(), { timeout: 5000 });
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

const deleteTransport = fakeTransport();
/** What the transport had been asked to do when the DELETE went out. */
let callsBeforeDelete: string[] = [];
const deleteRequest = fn(async () => {
  callsBeforeDelete = [...deleteTransport.calls];
});

/**
 * "Excluir treino": a pending edit is saved before the DELETE (so no autosave lands after it), then
 * back to the plan, and the engine is stopped: a later retry sends nothing.
 */
export const DeleteWorkout: Story = {
  args: {
    workoutId: 42,
    initial: treinoA,
    transport: deleteTransport,
    deleteWorkout: deleteRequest,
    delayMs: 60_000,
  },
  beforeEach: () => {
    deleteRequest.mockClear();
    deleteTransport.calls.length = 0;
    callsBeforeDelete = [];
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText("Nome do treino"), " v2");
    // The debounce (60 s here) has not fired: nothing sent yet.
    await expect(deleteTransport.calls).toEqual([]);
    await userEvent.click(canvas.getByRole("button", { name: "Excluir treino" }));
    const dialog = within(document.body).getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Excluir treino" }));
    await waitFor(() => expect(deleteRequest).toHaveBeenCalledWith(42));
    // The flush ran first: the PATCH was already sent when the DELETE went out.
    await expect(callsBeforeDelete).toEqual(["patchWorkout"]);
    const push = useRouter().push;
    await waitFor(() => expect(push).toHaveBeenCalledWith("/planos/7"));
    await expect(deleteRequest).toHaveBeenCalledTimes(1);
    await expect(deleteTransport.calls).toEqual(["patchWorkout"]);
  },
};

const failingFlushCalls: string[] = [];
/** Every save fails (a network error): the pending edit can't be flushed. */
const failingFlushTransport = {
  ...fakeTransport(),
  patchWorkout: async () => {
    failingFlushCalls.push("patchWorkout");
    throw new TypeError("Failed to fetch");
  },
};
const deleteAfterFailedFlush = fn(async () => undefined);

/**
 * The flush before the DELETE fails: the workout is deleted anyway (the edit was going with it),
 * and the failed save is not retried afterwards.
 */
export const DeleteAfterFailedFlush: Story = {
  args: {
    workoutId: 42,
    initial: treinoA,
    transport: failingFlushTransport,
    deleteWorkout: deleteAfterFailedFlush,
    delayMs: 60_000,
  },
  beforeEach: () => {
    deleteAfterFailedFlush.mockClear();
    failingFlushCalls.length = 0;
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText("Nome do treino"), " v2");
    await userEvent.click(canvas.getByRole("button", { name: "Excluir treino" }));
    const dialog = within(document.body).getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Excluir treino" }));
    await waitFor(() => expect(deleteAfterFailedFlush).toHaveBeenCalledWith(42));
    await expect(failingFlushCalls).toEqual(["patchWorkout"]);
    const push = useRouter().push;
    await waitFor(() => expect(push).toHaveBeenCalledWith("/planos/7"));
    // The footer's "Tentar novamente" (still on screen in the story) sends nothing now.
    await userEvent.click(canvas.getByRole("button", { name: "Tentar novamente" }));
    await expect(failingFlushCalls).toEqual(["patchWorkout"]);
  },
};

export const NewWorkoutHasNoDelete: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("button", { name: "Excluir treino" })).toBeNull();
  },
};

const collapseTransport = fakeTransport();

/**
 * Collapsing is view state only: cards open expanded, "Recolher todos" / "Expandir todos"
 * switches every card, and nothing is saved (collapsible-exercise-card R7, R12–R15).
 */
export const CollapseAndExpandAll: Story = {
  args: { workoutId: 42, initial: treinoA, transport: collapseTransport },
  beforeEach: () => {
    collapseTransport.calls.length = 0;
  },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getAllByRole("button", { name: "Ocultar séries" })).toHaveLength(3);

    const puxada = canvas.getByRole("group", { name: "Exercício 2: Puxada Alta na Polia" });
    await userEvent.click(within(puxada).getByRole("button", { name: "Ocultar séries" }));
    await expect(within(puxada).queryByRole("row")).toBeNull();
    await expect(canvas.getAllByRole("button", { name: "Ocultar séries" })).toHaveLength(2);

    await userEvent.click(canvas.getByRole("button", { name: "Recolher todos" }));
    await expect(canvas.getAllByRole("button", { name: "Mostrar séries" })).toHaveLength(3);
    await expect(canvas.queryByRole("row")).toBeNull();

    await userEvent.click(canvas.getByRole("button", { name: "Expandir todos" }));
    await expect(canvas.getAllByRole("button", { name: "Ocultar séries" })).toHaveLength(3);
    await expect(canvas.getByRole("button", { name: "Recolher todos" })).toBeVisible();

    // Never saved: the footer stays idle and nothing went to the BFF (R15).
    await expect(canvas.getByText("As alterações são salvas automaticamente")).toBeVisible();
    await expect(collapseTransport.calls).toEqual([]);
  },
};

/** One exercise: no editor-wide action, the card still toggles on its own (R12, E1). */
export const SingleExerciseHasNoCollapseAll: Story = {
  args: {
    workoutId: 42,
    initial: { ...treinoA, exercises: [puxadaCard] },
  },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.queryByRole("button", { name: "Recolher todos" })).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Ocultar séries" }));
    await expect(canvas.getByRole("button", { name: "Mostrar séries" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Expandir todos" })).toBeNull();
  },
};

const collapsedRefusal = fakeTransport({ refuseReplace: true, protectedSetIds: [101] });

/** A set removal is refused after its card was collapsed: the set comes back and the card expands (R11, E4). */
export const RefusedRemovalExpandsCollapsedCard: Story = {
  args: { workoutId: 42, initial: treinoA, transport: collapsedRefusal },
  beforeEach: () => {
    collapsedRefusal.calls.length = 0;
  },
  play: async ({ canvas, userEvent }) => {
    const supino = canvas.getByRole("group", { name: "Exercício 1: Supino Reto com Barra" });
    await userEvent.click(within(supino).getByRole("button", { name: "Remover série 1" }));
    await userEvent.click(within(supino).getByRole("button", { name: "Ocultar séries" }));
    await expect(within(supino).getByText("3 séries")).toBeVisible();

    await canvas.findByRole("alert", undefined, { timeout: 5000 });
    await expect(within(supino).getByRole("button", { name: "Ocultar séries" })).toBeVisible();
    await expect(within(supino).getAllByRole("row")).toHaveLength(4);
    await expect(
      within(supino).getByText("Remoção desfeita — desempenho registrado por um aluno"),
    ).toBeVisible();
  },
};

/**
 * A stream the story drives: answers every message with two stages and a proposal that adds
 * Agachamento and changes the Supino's rest, then `done`.
 */
const proposingStream: StreamWorkoutChat = async (body, { signal, onEvent }) => {
  const wait = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("aborted", "AbortError"));
      });
    });
  await wait(50);
  onEvent({ type: "stage", stage: "analyzing" });
  await wait(50);
  onEvent({ type: "stage", stage: "building_sets" });
  await wait(50);
  const [first, ...rest] = body.workout.exercises;
  onEvent({
    type: "proposal",
    exercises: [
      { ...first, key: first.key, exercise: supinoCard.exercise, restSecondsBetweenSets: 45, sets: first.sets ?? [] },
      ...rest.map((entry) => ({
        key: entry.key,
        exerciseId: entry.exerciseId,
        exercise: puxadaCard.exercise,
        restSecondsBetweenSets: entry.restSecondsBetweenSets ?? 60,
        notes: entry.notes ?? "",
        sets: entry.sets ?? [],
      })),
      { key: null, exerciseId: agachamentoCard.exercise.id, exercise: agachamentoCard.exercise, restSecondsBetweenSets: 60, notes: "", sets: [{ reps: 12, strategy: "STRAIGHT" }] },
    ],
  });
  onEvent({ type: "done" });
};

const assistantTransport = fakeTransport();

/**
 * The AI assistant end to end against a fake stream: the panel opens, the message builds a
 * proposal that shows in review with its markers and the review footer (R26, R33, R45), and
 * "Descartar" puts the saved workout back without saving anything (R39).
 */
export const AssistantProposalReview: Story = {
  args: {
    workoutId: 42,
    initial: { ...treinoA, exercises: [supinoCard, puxadaCard] },
    transport: assistantTransport,
    assistantAvailable: true,
    streamChat: proposingStream,
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Abrir assistente IA" }));
    await userEvent.type(canvas.getByLabelText("Mensagem para o assistente"), "Adicione agachamento");
    await userEvent.click(canvas.getByRole("button", { name: "Enviar" }));
    await expect(await canvas.findByText("Proposta pronta para revisão no editor.")).toBeVisible();
    await expect(canvas.getByText("Proposta em revisão — ainda não salva")).toBeVisible();
    await expect(canvas.getByText("Novo")).toBeVisible();
    await expect(canvas.getByText("Alterado")).toBeVisible();
    await expect(canvas.getByRole("group", { name: /Exercício 3: Agachamento/ })).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Descartar" }));
    await waitFor(() =>
      expect(canvas.queryByRole("group", { name: /Exercício 3/ })).not.toBeInTheDocument(),
    );
    await expect(canvas.queryByText("Proposta em revisão — ainda não salva")).not.toBeInTheDocument();
    await expect(assistantTransport.calls).not.toContain("replace");
  },
};

/** Lets the story flip the server's answer while the editor is mounted (the 30 s status poll). */
let setAssistantAvailable: ((available: boolean) => void) | null = null;
/** Holds the proposal back until the story releases it, so the flip lands while building. */
let releaseProposal: (() => void) | null = null;

function FlippableSession(props: WorkoutEditorSessionProps) {
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    setAssistantAvailable = setAvailable;
  }, []);
  return <WorkoutEditorSession {...props} assistantAvailable={available} />;
}

const heldProposalStream: StreamWorkoutChat = async (body, options) => {
  options.onEvent({ type: "stage", stage: "building_sets" });
  await new Promise<void>((resolve) => {
    releaseProposal = resolve;
  });
  await proposingStream(body, options);
};

/**
 * Feature-flags spec §8.1: `AI_ASSISTANT_ENABLED` turns off while a proposal is being built. The
 * editor stays locked and the panel open, the proposal still reaches review, and only once the
 * trainer discards it and closes the panel does the AI button go, focus landing on
 * "+ Adicionar exercício" rather than on `<body>`.
 */
export const AssistantTurnedOffWhileBuilding: Story = {
  args: {
    workoutId: 42,
    initial: { ...treinoA, exercises: [supinoCard, puxadaCard] },
    transport: fakeTransport(),
    streamChat: heldProposalStream,
  },
  beforeEach: () => {
    releaseProposal = null;
    setAssistantAvailable = null;
  },
  render: (args) => <FlippableSession {...args} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Abrir assistente IA" }));
    await userEvent.type(canvas.getByLabelText("Mensagem para o assistente"), "Adicione agachamento");
    await userEvent.click(canvas.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(releaseProposal).not.toBeNull());
    await waitFor(() => expect(canvas.getByLabelText("Nome do treino").closest("[inert]")).not.toBeNull());

    setAssistantAvailable!(false);
    // Still locked, panel still open.
    await expect(canvas.getByLabelText("Nome do treino").closest("[inert]")).not.toBeNull();
    await expect(canvas.getByRole("button", { name: "Fechar assistente" })).toBeVisible();

    releaseProposal!();
    await expect(await canvas.findByText("Proposta em revisão — ainda não salva")).toBeVisible();
    await expect(canvas.getByRole("button", { name: /assistente IA/ })).toBeInTheDocument();

    await userEvent.click(canvas.getByRole("button", { name: "Descartar" }));
    await waitFor(() =>
      expect(canvas.queryByText("Proposta em revisão — ainda não salva")).not.toBeInTheDocument(),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Fechar assistente" }));
    await waitFor(() =>
      expect(canvas.queryByRole("button", { name: /assistente IA/ })).not.toBeInTheDocument(),
    );
    await expect(canvas.getByRole("button", { name: "+ Adicionar exercício" })).toHaveFocus();
  },
};

/**
 * The same flip with the panel open and idle, closed from the AI button itself (not the panel's
 * "Fechar assistente"): the button goes, and focus lands on "+ Adicionar exercício".
 */
export const AssistantTurnedOffClosedFromButton: Story = {
  args: {
    workoutId: 42,
    initial: { ...treinoA, exercises: [supinoCard, puxadaCard] },
    transport: fakeTransport(),
    streamChat: proposingStream,
  },
  beforeEach: () => {
    setAssistantAvailable = null;
  },
  render: (args) => <FlippableSession {...args} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Abrir assistente IA" }));
    await waitFor(() => expect(setAssistantAvailable).not.toBeNull());
    setAssistantAvailable!(false);
    // The panel is open, so the latch keeps the button.
    const aiButton = await canvas.findByRole("button", { name: "Fechar assistente IA" });
    await userEvent.click(aiButton);
    await waitFor(() =>
      expect(canvas.queryByRole("button", { name: /assistente IA/ })).not.toBeInTheDocument(),
    );
    await expect(canvas.getByRole("button", { name: "+ Adicionar exercício" })).toHaveFocus();
  },
};

/** The flag off (production default): no AI button at all. */
export const AssistantDisabled: Story = {
  args: { workoutId: 42, initial: treinoA, assistantAvailable: false },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("button", { name: /assistente IA/ })).not.toBeInTheDocument();
  },
};
