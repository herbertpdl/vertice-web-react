import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor } from "storybook/test";
import { WorkoutExerciseCard } from "./WorkoutExerciseCard";
import {
  agachamento,
  agachamentoCard,
  exercise,
  puxadaCard,
  set,
  supino,
  supinoCard,
} from "../storyFixtures";

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
    // One pill per muscle group, primary first.
    await expect(canvas.getByText("Peito")).toBeVisible();
    await expect(canvas.getByText("Tríceps")).toBeVisible();
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

/** The card's own button collapses it (collapsible-exercise-card R1). */
export const ToggleCollapse: Story = {
  args: { onToggleCollapsed: fn() },
  play: async ({ canvas, userEvent, args }) => {
    const toggle = canvas.getByRole("button", { name: "Ocultar séries" });
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(toggle);
    await expect(args.onToggleCollapsed).toHaveBeenCalledTimes(1);
  },
};

/** Collapsed: header, set count and notes icon; no notes box, sets, rest or "+ Adicionar série" (R2, R5). */
export const Collapsed: Story = {
  args: { collapsed: true, onToggleCollapsed: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByText("Supino Reto com Barra")).toBeVisible();
    await expect(canvas.getByText("Peito")).toBeVisible();
    await expect(canvas.getByText("4 séries")).toBeVisible();
    await expect(canvas.getByRole("img", { name: "Notas do exercício" })).toBeVisible();
    await expect(canvas.queryByLabelText("Notas")).toBeNull();
    await expect(canvas.queryByRole("row")).toBeNull();
    await expect(canvas.queryByLabelText("Descanso entre séries (segundos)")).toBeNull();
    await expect(canvas.queryByRole("button", { name: "+ Adicionar série" })).toBeNull();
    // Removing still works from the collapsed card (R16).
    await userEvent.click(canvas.getByRole("button", { name: "Remover exercício Supino Reto com Barra" }));
    await expect(args.onRemove).toHaveBeenCalled();
    const toggle = canvas.getByRole("button", { name: "Mostrar séries" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    await expect(args.onToggleCollapsed).toHaveBeenCalled();
  },
};

/** No sets, no notes, no video: "Nenhuma série", and neither the notes icon nor "Ver vídeo" (R3, E7, E10). */
export const CollapsedNoSets: Story = {
  args: {
    exercise: exercise({ ...agachamento, videoUrl: "" }, { id: 12 }),
    position: 3,
    collapsed: true,
    onToggleCollapsed: fn(),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Nenhuma série")).toBeVisible();
    await expect(canvas.queryByRole("img", { name: "Notas do exercício" })).toBeNull();
    await expect(canvas.queryByText("Ver vídeo")).toBeNull();
  },
};

/** Ten sets read "10 séries", with no cap hint (E6). */
export const CollapsedAtSetCap: Story = {
  args: {
    ...SetCapReached.args,
    collapsed: true,
    onToggleCollapsed: fn(),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("10 séries")).toBeVisible();
    await expect(canvas.queryByText(/Limite de 10 séries/)).toBeNull();
  },
};

/** Keyboard focus on the notes icon shows the full note (R4). */
export const CollapsedNotesOnFocus: Story = {
  args: { collapsed: true, onToggleCollapsed: fn() },
  play: async ({ canvas }) => {
    const icon = canvas.getByRole("img", { name: "Notas do exercício" });
    await expect(icon).toHaveAccessibleDescription(supinoCard.notes);
    await expect(canvas.getByRole("tooltip")).toHaveStyle({ opacity: "0" });
    icon.focus();
    await expect(icon).toHaveFocus();
    await waitFor(() => expect(canvas.getByRole("tooltip")).toHaveStyle({ opacity: "1" }));
  },
};

/** A collapsed card can be dragged like an expanded one (R17). */
export const CollapsedDragging: Story = {
  args: { collapsed: true, onToggleCollapsed: fn(), dragState: "dragging" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Arrastando")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Arrastar exercício 1" })).toBeVisible();
  },
};
