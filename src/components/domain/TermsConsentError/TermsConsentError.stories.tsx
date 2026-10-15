import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { TermsConsentError } from "./TermsConsentError";

const meta = {
  component: TermsConsentError,
  args: { retrying: false, onRetry: fn(), onSignOut: fn() },
} satisfies Meta<typeof TermsConsentError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Tentar novamente" }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole("button", { name: "Sair" }));
    await expect(args.onSignOut).toHaveBeenCalledOnce();
  },
};

export const Retrying: Story = {
  args: { retrying: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Tentar novamente" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await expect(canvas.getByRole("button", { name: "Sair" })).toBeDisabled();
  },
};
