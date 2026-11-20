import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { RemovedExerciseCard } from "./RemovedExerciseCard";
import { puxadaCard } from "../storyFixtures";

const meta = {
  component: RemovedExerciseCard,
  args: { exercise: puxadaCard },
  decorators: [
    (Story) => (
      <div style={{ width: 1100 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RemovedExerciseCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A saved exercise the proposal drops (R33): struck through, labelled, not just colored. */
export const Removed: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Removido")).toBeVisible();
    await expect(canvas.getByRole("group", { name: /Removido pela proposta: Puxada/ })).toBeVisible();
  },
};
