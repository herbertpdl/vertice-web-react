import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { CloneWorkoutDialog } from "./CloneWorkoutDialog";
import { recentWorkouts } from "../storyFixtures";
import { withSeededQueries } from "../storyQuery";

const meta = {
  component: CloneWorkoutDialog,
  args: { onClose: fn(), onPick: fn() },
  decorators: [withSeededQueries({ '["recentWorkouts"]': recentWorkouts })],
} satisfies Meta<typeof CloneWorkoutDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText("Treino A — Peito e Costas")).toBeVisible();
    await userEvent.type(canvas.getByPlaceholderText("Buscar por treino, aluno ou plano..."), "João");
    await expect(canvas.queryByText("Treino A — Peito e Costas")).not.toBeInTheDocument();
    await expect(canvas.getByText("Full body")).toBeVisible();
  },
};
