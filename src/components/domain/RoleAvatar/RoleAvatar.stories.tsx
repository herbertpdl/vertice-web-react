import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { RoleAvatar } from "./RoleAvatar";

const meta = {
  component: RoleAvatar,
  args: { name: "Ana Ribeiro", role: "TRAINER" },
} satisfies Meta<typeof RoleAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Trainer: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("AR")).toBeVisible();
  },
};
export const Client: Story = { args: { name: "Marina Costa", role: "CLIENT" } };
export const Large: Story = { args: { size: "lg" } };
