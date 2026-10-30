import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import { AddExerciseDialog } from "./AddExerciseDialog";
import { catalog, exercisePages, muscleGroups, puxada, remadaPropria, supino } from "../storyFixtures";
import { withSeededQueries } from "../storyQuery";
import { exercisesQueryKey } from "@/lib/api/exercises";
import { muscleGroupsQueryKey } from "@/lib/api/muscleGroups";

// What GET /exercises?q=pol answers.
const polKey = JSON.stringify(exercisesQueryKey({ q: "pol" }));
const groupsKey = JSON.stringify(muscleGroupsQueryKey);
const crucifixo = catalog[4]!;
const hint = "Digite ao menos 3 letras ou escolha um grupo muscular";

const meta = {
  component: AddExerciseDialog,
  args: { onClose: fn(), onPick: fn() },
  decorators: [
    withSeededQueries({
      [polKey]: exercisePages([puxada, crucifixo]),
      [groupsKey]: muscleGroups,
      // The Costas subset GET /exercises?muscleGroupId=2 answers, over two pages.
      [JSON.stringify(exercisesQueryKey({ muscleGroupId: 2 }))]: exercisePages([puxada], [remadaPropria]),
    }),
  ],
} satisfies Meta<typeof AddExerciseDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

type PlayContext = Parameters<NonNullable<Story["play"]>>[0];
const searchFor = ({ canvas, userEvent }: PlayContext, text: string) =>
  userEvent.type(canvas.getByLabelText("Buscar exercício por nome"), text);

/** Opening loads nothing: a prompt until 3 letters or a group (lazy-exercise-search). */
export const Idle: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(hint)).toBeVisible();
    await expect(canvas.queryAllByRole("button", { name: /^Adicionar / })).toHaveLength(0);
    await expect(canvas.queryByText(/Não encontrou o exercício\?/)).toBeNull();
  },
};

/** Two letters are not a search: still the prompt, no request (spec D5). */
export const TwoLettersStayIdle: Story = {
  play: async (context) => {
    const { canvas } = context;
    await searchFor(context, "po");
    await new Promise((resolve) => setTimeout(resolve, 400));
    await expect(canvas.getByText(hint)).toBeVisible();
    await expect(canvas.queryAllByRole("button", { name: /^Adicionar / })).toHaveLength(0);
  },
};

export const Default: Story = {
  play: async (context) => {
    const { canvas, userEvent, args } = context;
    await searchFor(context, "pol");
    await userEvent.click(await canvas.findByRole("button", { name: "Adicionar Crucifixo na Polia" }));
    await expect(args.onPick).toHaveBeenCalledWith(crucifixo);
    await expect(args.onClose).toHaveBeenCalled();
  },
};

export const CapReached: Story = {
  args: { atCap: true },
  play: async (context) => {
    const { canvas } = context;
    await expect(
      canvas.getByText("Este treino já tem 20 exercícios — o máximo permitido"),
    ).toBeVisible();
    await searchFor(context, "pol");
    await canvas.findByRole("button", { name: "Adicionar Puxada Alta na Polia" });
    for (const button of canvas.getAllByRole("button", { name: /^Adicionar / })) {
      await expect(button).toBeDisabled();
    }
  },
};

/** First load: skeletons, and the "not found" prompt must not flash (F17). */
export const Loading: Story = {
  decorators: [withSeededQueries({ [groupsKey]: muscleGroups }, { pending: [polKey] })],
  play: async (context) => {
    const { canvas } = context;
    await searchFor(context, "pol");
    await waitFor(() => expect(canvas.queryByText(hint)).toBeNull());
    await expect(canvas.queryByText(/Não encontrou o exercício\?/)).toBeNull();
    await expect(canvas.queryAllByRole("button", { name: /^Adicionar / })).toHaveLength(0);
  },
};

export const ListError: Story = {
  decorators: [withSeededQueries({ [groupsKey]: muscleGroups }, { failing: [polKey] })],
  play: async (context) => {
    const { canvas } = context;
    await searchFor(context, "pol");
    await expect(await canvas.findByText(/Não foi possível carregar os exercícios/)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
    await expect(canvas.queryByText(/Não encontrou o exercício\?/)).toBeNull();
  },
};

/**
 * Picking a group queries the server with no text; rows are its pages, in its order (R45).
 * "Todos os grupos" goes back to the prompt, never to the whole catalog.
 */
export const FilteredByGroup: Story = {
  play: async ({ canvas, userEvent }) => {
    const body = within(document.body);
    await userEvent.click(canvas.getByRole("button", { name: "Todos os grupos" }));
    await userEvent.click(await body.findByRole("option", { name: "Costas" }));
    await waitFor(() => expect(canvas.queryByText(hint)).toBeNull());
    const adds = canvas.getAllByRole("button", { name: /^Adicionar / });
    await expect(adds.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Adicionar Puxada Alta na Polia",
      "Adicionar Remada Unilateral no Banco",
    ]);
    await expect(canvas.queryByRole("button", { name: `Adicionar ${supino.name}` })).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Costas" }));
    await userEvent.click(await body.findByRole("option", { name: "Todos os grupos" }));
    await expect(await canvas.findByText(hint)).toBeVisible();
    await expect(canvas.queryAllByRole("button", { name: /^Adicionar / })).toHaveLength(0);
  },
};

/** Create mode shares the dialog form's rule: no group, no submit (R40). */
export const CreateMissingGroup: Story = {
  play: async ({ canvas, userEvent }) => {
    const body = within(document.body);
    await userEvent.click(canvas.getByRole("button", { name: "Criar novo" }));
    await userEvent.type(canvas.getByLabelText("Nome do exercício"), "Remada Unilateral no Banco");
    const submit = canvas.getByRole("button", { name: "Criar e adicionar" });
    await expect(submit).toBeDisabled();
    await userEvent.click(canvas.getByRole("button", { name: "Grupos musculares" }));
    await userEvent.click(await body.findByRole("option", { name: "Costas" }));
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(body.getByRole("option", { name: "Costas" }));
    await userEvent.keyboard("{Escape}");
    await expect(await canvas.findByText("Selecione pelo menos um grupo muscular")).toBeVisible();
    await expect(submit).toBeDisabled();
  },
};
