import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { ExerciseRow } from "./ExerciseRow";
import { puxada, remadaPropria, supino } from "../storyFixtures";

const meta = {
  component: ExerciseRow,
  args: { exercise: supino, onEdit: fn() },
  decorators: [
    (Story) => (
      <div style={{ width: 960 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ExerciseRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Starter-set rows offer no edit action and carry no marker (R28, D15). */
export const Starter: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("button", { name: "Editar exercício" })).toBeNull();
    await expect(canvas.getByText("Peito")).toBeVisible();
    await expect(canvas.getByText("Tríceps")).toBeVisible();
  },
};

export const Own: Story = {
  args: { exercise: remadaPropria },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Editar exercício" }));
    await expect(args.onEdit).toHaveBeenCalledWith(remadaPropria);
  },
};

export const NoVideo: Story = {
  args: { exercise: puxada },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("—")).toBeVisible();
  },
};
