import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor } from "storybook/test";
import { SetPasswordForm, SETUP_TOKEN_STORAGE_KEY } from "./SetPasswordForm";
import { ApiError } from "@/lib/api/client";
import type { PasswordSetupResult } from "@/lib/api/types";
import type { AppDownloadDevice } from "@/components/domain/AppDownload";

const TOKEN = "q2Zt8kV0b1xWmN4pR7sYcE3hJ6uA9dLfG5oTiK8wBzM";
const CLIENT_EMAIL = "bia+treino@example.com";

const meta = {
  component: SetPasswordForm,
  args: {
    token: TOKEN,
    submit: fn(async (): Promise<PasswordSetupResult> => ({ role: "CLIENT", email: CLIENT_EMAIL })),
    device: (): AppDownloadDevice => "phone",
  },
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

/**
 * Opened from the link on a phone by a client: the token is kept for the tab, then the client's
 * success state sends them to the app (R10, R10a, R10b): "Abrir o app" with their email, the
 * store links, and no web login.
 */
export const FromLink: Story = {
  play: async (context) => {
    const { canvas, args } = context;
    await waitFor(() => expect(sessionStorage.getItem(SETUP_TOKEN_STORAGE_KEY)).toBe(TOKEN));
    await fillAndSubmit(context);
    await expect(args.submit).toHaveBeenCalledWith({ token: TOKEN, newPassword: "senha-forte-123" });
    await expect(await canvas.findByRole("heading", { name: "Senha definida" })).toBeVisible();
    await expect(sessionStorage.getItem(SETUP_TOKEN_STORAGE_KEY)).toBeNull();
    await expect(canvas.getByRole("link", { name: "Abrir o app" })).toHaveAttribute(
      "href",
      "verticemobile://login?email=bia%2Btreino%40example.com",
    );
    await expect(canvas.getByRole("link", { name: /App Store/ })).toBeVisible();
    await expect(canvas.getByRole("link", { name: /Google Play/ })).toBeVisible();
    await expect(canvas.queryByRole("link", { name: "Ir para o login" })).toBeNull();
    await expect(canvas.queryByRole("img", { name: /QR code/ })).toBeNull();
  },
};

/** A client on a computer: the QR code instead of the button and the store links (R10c, E14). */
export const ClientOnComputer: Story = {
  args: { device: (): AppDownloadDevice => "computer" },
  play: async (context) => {
    const { canvas } = context;
    await fillAndSubmit(context);
    await expect(await canvas.findByRole("img", { name: "QR code para baixar o app Vertice" })).toBeVisible();
    await expect(canvas.getByText("Aponte a câmera do celular para baixar o app Vertice.")).toBeVisible();
    await expect(canvas.queryByRole("link", { name: "Abrir o app" })).toBeNull();
    await expect(canvas.queryByRole("link", { name: /App Store/ })).toBeNull();
    await expect(canvas.queryByRole("link", { name: "Ir para o login" })).toBeNull();
  },
};

/** A trainer's first access keeps today's screen, with the web login (R11). */
export const Trainer: Story = {
  args: { submit: fn(async (): Promise<PasswordSetupResult> => ({ role: "TRAINER", email: "ana@example.com" })) },
  play: async (context) => {
    const { canvas } = context;
    await fillAndSubmit(context);
    await expect(await canvas.findByRole("link", { name: "Ir para o login" })).toHaveAttribute("href", "/login");
    await expect(canvas.queryByRole("link", { name: "Abrir o app" })).toBeNull();
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
