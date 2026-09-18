import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { EditorFooter } from "./EditorFooter";

const meta = {
  component: EditorFooter,
  args: { status: "saved", onRetry: fn(), onFinish: fn() },
  decorators: [
    (Story) => (
      <div style={{ width: 1036 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EditorFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = { args: { status: "idle" } };
export const Saving: Story = { args: { status: "saving" } };
export const Saved: Story = { args: { status: "saved" } };
export const Finishing: Story = { args: { status: "saving", finishing: true } };

export const Error: Story = {
  args: { status: "error", errorMessage: "Failed to fetch" },
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByText("Erro ao salvar —")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Tentar novamente" }));
    await expect(args.onRetry).toHaveBeenCalled();
  },
};
