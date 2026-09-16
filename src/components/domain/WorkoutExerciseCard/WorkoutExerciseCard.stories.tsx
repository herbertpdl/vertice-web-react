import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { WorkoutExerciseCard } from "./WorkoutExerciseCard";
import { agachamentoCard, exercise, puxadaCard, set, supino, supinoCard } from "../storyFixtures";

const meta = {
  component: WorkoutExerciseCard,
  args: {
    exercise: supinoCard,
    position: 1,
    onUpdate: fn(),
    onRemove: fn(),
    onAddSet: fn(),
    onDuplicateSet: fn(),
    onRemoveSet: fn(),
    onUpdateSet: fn(),
    onMoveSet: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 1536 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WorkoutExerciseCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSets: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByText("Supino Reto com Barra")).toBeVisible();
    await expect(canvas.getAllByRole("row")).toHaveLength(4);
    await userEvent.click(canvas.getByRole("button", { name: "+ Adicionar série" }));
    await expect(args.onAddSet).toHaveBeenCalled();
    await userEvent.click(canvas.getByRole("button", { name: "Remover série 2" }));
    await expect(args.onRemoveSet).toHaveBeenCalledWith(supinoCard.sets[1].key);
  },
};

export const NoSets: Story = {
  args: { exercise: agachamentoCard, position: 3 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("Nenhuma série ainda — este exercício será salvo sem séries"),
    ).toBeVisible();
  },
};

export const Dragging: Story = {
  args: { exercise: agachamentoCard, position: 3, dragState: "dragging" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Arrastando")).toBeVisible();
  },
};

export const DraggingSet: Story = {
  args: { draggingSetKey: supinoCard.sets[2].key },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Séries só podem ser reordenadas/)).toBeVisible();
  },
};

export const NotAllowedDropTarget: Story = {
  args: { exercise: puxadaCard, position: 2, dragState: "not-allowed" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("Não é possível soltar uma série de outro exercício aqui"),
    ).toBeVisible();
  },
};

export const SetCapReached: Story = {
  args: {
    exercise: exercise(supino, {
      id: 20,
      sets: Array.from({ length: 10 }, (_, i) => set({ id: 200 + i, reps: 10, weight: "40" })),
    }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "+ Adicionar série" })).toBeDisabled();
    await expect(canvas.getByText(/Limite de 10 séries por exercício atingido/)).toBeVisible();
  },
};

export const RefusedRemoval: Story = {
  args: { refused: true, refusedSetKeys: [supinoCard.sets[1].key] },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("Remoção desfeita — desempenho registrado por um aluno"),
    ).toBeVisible();
  },
};
