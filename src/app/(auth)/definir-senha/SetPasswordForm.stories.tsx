import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor } from "storybook/test";
import { SetPasswordForm, SETUP_TOKEN_STORAGE_KEY } from "./SetPasswordForm";
import { ApiError } from "@/lib/api/client";

const TOKEN = "q2Zt8kV0b1xWmN4pR7sYcE3hJ6uA9dLfG5oTiK8wBzM";

const meta = {
  component: SetPasswordForm,
  args: { token: TOKEN, submit: fn(async () => undefined) },
  beforeEach: () => {
    sessionStorage.removeItem(SETUP_TOKEN_STORAGE_KEY);
    return () => sessionStorage.removeItem(SETUP_TOKEN_STORAGE_KEY);
  },
} satisfies Meta<typeof SetPasswordForm>;

export default meta;
type Story = StoryObj<typeof meta>;

type Play = NonNullable<Story["play"]>;
async function fillAndSubmit({ canvas, userEvent }: Parameters<Play>[0]) {
  await userEvent.type(canvas.getByLabelText("Nova senha"), "senha-forte-123");
  await userEvent.type(canvas.getByLabelText("Confirmar senha"), "senha-forte-123");
  await userEvent.click(canvas.getByRole("button", { name: "Definir senha" }));
}

/** Opened from the link: the token is kept for the tab, then the success state. */
export const FromLink: Story = {
  play: async (context) => {
    const { canvas, args } = context;
    await waitFor(() => expect(sessionStorage.getItem(SETUP_TOKEN_STORAGE_KEY)).toBe(TOKEN));
    await fillAndSubmit(context);
    await expect(args.submit).toHaveBeenCalledWith({ token: TOKEN, newPassword: "senha-forte-123" });
    await expect(await canvas.findByRole("heading", { name: "Senha definida" })).toBeVisible();
    await expect(sessionStorage.getItem(SETUP_TOKEN_STORAGE_KEY)).toBeNull();
  },
};

/** A reload after the URL was stripped: the token comes back from sessionStorage. */
export const ReloadAfterStrip: Story = {
  args: { token: "" },
  beforeEach: () => {
    sessionStorage.setItem(SETUP_TOKEN_STORAGE_KEY, TOKEN);
  },
  play: async (context) => {
    const { canvas, args } = context;
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Definir senha" })).toBeEnabled(),
    );
    await expect(canvas.queryByRole("alert")).toBeNull();
    await fillAndSubmit(context);
    await expect(args.submit).toHaveBeenCalledWith({ token: TOKEN, newPassword: "senha-forte-123" });
  },
};

/** No token in the link nor in this tab: "incompleto", not "inválido ou expirado". */
export const MissingToken: Story = {
  args: { token: "" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Link incompleto — abra o link completo enviado pelo seu treinador.",
    );
    await expect(canvas.getByRole("button", { name: "Definir senha" })).toBeDisabled();
  },
};

export const InvalidToken: Story = {
  args: {
    submit: fn(async () => {
      throw new ApiError({ code: "INVALID_SETUP_TOKEN", message: "Invalid setup token" }, 400);
    }),
  },
  play: async (context) => {
    const { canvas } = context;
    await fillAndSubmit(context);
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Link inválido ou expirado — peça um novo ao seu treinador.",
    );
    await expect(sessionStorage.getItem(SETUP_TOKEN_STORAGE_KEY)).toBeNull();
  },
};

export const RateLimited: Story = {
  args: {
    submit: fn(async () => {
      throw new ApiError({ code: "RATE_LIMITED", message: "Too many requests" }, 429, 900);
    }),
  },
  play: async (context) => {
    await fillAndSubmit(context);
    await expect(await context.canvas.findByRole("alert")).toHaveTextContent(
      "Muitas tentativas. Tente novamente em 15 minutos.",
    );
  },
};
