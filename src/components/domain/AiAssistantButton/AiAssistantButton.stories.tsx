import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { AiAssistantButton } from "./AiAssistantButton";

const meta = {
  component: AiAssistantButton,
  args: { open: false, busy: false, onClick: fn() },
} satisfies Meta<typeof AiAssistantButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Abrir assistente IA" }));
    await expect(args.onClick).toHaveBeenCalled();
  },
};

export const Open: Story = { args: { open: true } };

/** Panel closed while a message is processed (frame `rLKpQ`, R47). */
export const WorkingWhileClosed: Story = {
  args: { busy: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("IA trabalhando…")).toBeVisible();
  },
};
