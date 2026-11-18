import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { AdminUnavailable } from "./AdminUnavailable";

const meta = { component: AdminUnavailable } satisfies Meta<typeof AdminUnavailable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** `GET /auth/me` failed on the server: a retry, with no admin data and no shell. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Não foi possível carregar o painel" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Tentar novamente" })).toBeEnabled();
  },
};
