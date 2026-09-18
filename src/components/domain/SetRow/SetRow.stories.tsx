import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { SetRow } from "./SetRow";
import { set } from "../storyFixtures";

const meta = {
  component: SetRow,
  args: {
    set: set({ id: 102, reps: 8, weight: "60", loadPercentage: "75", restSeconds: 90 }),
    setNumber: 2,
    onUpdate: fn(),
    onDuplicate: fn(),
    onRemove: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 900 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SetRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const reps = canvas.getByLabelText("Reps da série 2");
    await userEvent.clear(reps);
    await userEvent.type(reps, "10");
    await expect(args.onUpdate).toHaveBeenLastCalledWith({ reps: 10 });
    // A non-numeric value is flagged and never committed.
    await userEvent.type(reps, "x");
    await expect(reps).toHaveAttribute("aria-invalid", "true");
  },
};
export const Empty: Story = { args: { set: set({ strategy: "DROPSET" }), setNumber: 3 } };
export const Dragging: Story = { args: { dragging: true } };
export const Refused: Story = {
  args: { refused: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("Remoção desfeita — desempenho registrado por um aluno"),
    ).toBeVisible();
  },
};
export const DuplicateDisabled: Story = {
  args: { duplicateDisabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Duplicar série 2" })).toBeDisabled();
  },
};
