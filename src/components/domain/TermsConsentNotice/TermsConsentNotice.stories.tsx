import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { TermsConsentNotice } from "./TermsConsentNotice";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";

const meta = {
  component: TermsConsentNotice,
  args: {
    version: LEGAL_VERSIONS.terms,
    updated: false,
    accepting: false,
    error: null,
    onAccept: fn(),
    onSignOut: fn(),
  },
} satisfies Meta<typeof TermsConsentNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstAccess: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByRole("heading", { name: "Antes de continuar" })).toBeVisible();
    await expect(canvas.getByText(`(versão ${LEGAL_VERSIONS.terms}).`, { exact: false })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Aceitar" }));
    await expect(args.onAccept).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole("button", { name: "Sair" }));
    await expect(args.onSignOut).toHaveBeenCalledOnce();
  },
};

export const Updated: Story = {
  args: { updated: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Atualizamos nossos termos" })).toBeVisible();
  },
};

export const Accepting: Story = {
  args: { accepting: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Aceitar" })).toHaveAttribute("aria-busy", "true");
    await expect(canvas.getByRole("button", { name: "Sair" })).toBeDisabled();
  },
};

export const AcceptError: Story = {
  args: { error: "Não foi possível registrar o aceite. Tente novamente." },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("Não foi possível registrar o aceite");
  },
};
