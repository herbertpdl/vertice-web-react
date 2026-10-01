import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import { AddExerciseDialog } from "./AddExerciseDialog";
import { catalog, muscleGroups, puxada, remadaPropria } from "../storyFixtures";
import { withSeededQueries } from "../storyQuery";
import { exercisesQueryKey } from "@/lib/api/exercises";
import { muscleGroupsQueryKey } from "@/lib/api/muscleGroups";

const listKey = JSON.stringify(exercisesQueryKey({}));
const groupsKey = JSON.stringify(muscleGroupsQueryKey);

const meta = {
  component: AddExerciseDialog,
  args: { onClose: fn(), onPick: fn() },
  decorators: [
    withSeededQueries({
      [listKey]: catalog,
      [groupsKey]: muscleGroups,
      // The Costas subset GET /exercises?muscleGroupId=2 answers.
      [JSON.stringify(exercisesQueryKey({ muscleGroupId: 2 }))]: [puxada, remadaPropria],
    }),
  ],
} satisfies Meta<typeof AddExerciseDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Adicionar Crucifixo na Polia" }));
    await expect(args.onPick).toHaveBeenCalledWith(catalog[4]);
    await expect(args.onClose).toHaveBeenCalled();
  },
};

export const CapReached: Story = {
  args: { atCap: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("Este treino já tem 20 exercícios — o máximo permitido"),
    ).toBeVisible();
    for (const button of canvas.getAllByRole("button", { name: /^Adicionar / })) {
      await expect(button).toBeDisabled();
    }
  },
};

/** First load: skeletons, and the "not found" prompt must not flash (F17). */
export const Loading: Story = {
  decorators: [withSeededQueries({ [groupsKey]: muscleGroups }, { pending: [listKey] })],
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/Não encontrou o exercício\?/)).toBeNull();
    await expect(canvas.queryAllByRole("button", { name: /^Adicionar / })).toHaveLength(0);
  },
};

export const ListError: Story = {
  decorators: [withSeededQueries({ [groupsKey]: muscleGroups }, { failing: [listKey] })],
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Não foi possível carregar os exercícios/)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
    await expect(canvas.queryByText(/Não encontrou o exercício\?/)).toBeNull();
  },
};

/** Picking a group re-queries the server; rows are what it answers, in its order (R45). */
export const FilteredByGroup: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("button", { name: "Adicionar Supino Reto com Barra" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Todos os grupos" }));
    await userEvent.click(await within(document.body).findByRole("option", { name: "Costas" }));
    await waitFor(() =>
      expect(canvas.queryByRole("button", { name: "Adicionar Supino Reto com Barra" })).toBeNull(),
    );
    const adds = canvas.getAllByRole("button", { name: /^Adicionar / });
    await expect(adds.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Adicionar Puxada Alta na Polia",
      "Adicionar Remada Unilateral no Banco",
    ]);
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
