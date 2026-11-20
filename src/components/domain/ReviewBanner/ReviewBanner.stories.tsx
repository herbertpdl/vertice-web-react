import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { ReviewBanner } from "./ReviewBanner";

const meta = {
  component: ReviewBanner,
  args: { onApply: fn(), onDiscard: fn() },
  decorators: [
    (Story) => (
      <div style={{ width: 1100 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ReviewBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InReview: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Aplicar" }));
    await expect(args.onApply).toHaveBeenCalled();
    await userEvent.click(canvas.getByRole("button", { name: "Descartar" }));
    await expect(args.onDiscard).toHaveBeenCalled();
  },
};

/** A message is still being processed: neither action until it ends. */
export const WhileAssistantWorks: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Aplicar" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Descartar" })).toBeDisabled();
  },
};
