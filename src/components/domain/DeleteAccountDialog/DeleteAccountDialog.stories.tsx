import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, mocked, waitFor, within } from "storybook/test";
import { ACCOUNT_DELETED_URL, DeleteAccountDialog } from "./DeleteAccountDialog";
import { ApiError } from "@/lib/api/client";

const meta = {
  component: DeleteAccountDialog,
  args: {
    role: "TRAINER",
    onClose: fn(),
    api: {
      deleteAccount: fn(async () => undefined),
      logout: fn(async () => undefined),
      leave: fn(),
    },
  },
} satisfies Meta<typeof DeleteAccountDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

type Canvas = ReturnType<typeof within>;

const phraseField = (canvas: Canvas) => canvas.getByLabelText("Digite EXCLUIR para confirmar");
const passwordField = (canvas: Canvas) => canvas.getByLabelText("Sua senha");
const submitButton = (canvas: Canvas) => canvas.getByRole("button", { name: "Excluir conta" });

async function fillIn(
  canvas: Canvas,
  userEvent: { type: (element: Element, text: string) => Promise<void> },
  password = "s3nha-atual",
) {
  await userEvent.type(phraseField(canvas), "EXCLUIR");
  await userEvent.type(passwordField(canvas), password);
}

function refusal(code: string, status: number, retryAfter?: number) {
  return fn(async () => {
    throw new ApiError({ code, message: "English upstream text" }, status, retryAfter);
  });
}

/** The button stays locked until the exact phrase and a password are both in. */
export const ConfirmationPhraseGating: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByRole("heading", { name: "Excluir conta?" })).toBeVisible();
    await expect(submitButton(canvas)).toBeDisabled();

    await userEvent.type(passwordField(canvas), "s3nha-atual");
    await expect(submitButton(canvas)).toBeDisabled();

    await userEvent.type(phraseField(canvas), "excluir");
    await expect(submitButton(canvas)).toBeDisabled();

    await userEvent.clear(phraseField(canvas));
    await userEvent.type(phraseField(canvas), "EXCLUIR");
    await expect(submitButton(canvas)).toBeEnabled();

    await userEvent.clear(passwordField(canvas));
    await expect(submitButton(canvas)).toBeDisabled();
    // Enter in a field can't get around the lock either.
    await userEvent.type(phraseField(canvas), "{Enter}");
    await expect(args.api!.deleteAccount).not.toHaveBeenCalled();
  },
};

/** 400 INVALID_CURRENT_PASSWORD: an inline error on the password, no logout, no navigation. */
export const WrongPassword: Story = {
  args: {
    api: {
      deleteAccount: refusal("INVALID_CURRENT_PASSWORD", 400),
      logout: fn(async () => undefined),
      leave: fn(),
    },
  },
  play: async ({ canvas, userEvent, args }) => {
    await fillIn(canvas, userEvent, "errada");
    await userEvent.click(submitButton(canvas));
    await expect(await canvas.findByText("Senha incorreta")).toBeVisible();
    await expect(args.api!.deleteAccount).toHaveBeenCalledWith("errada");
    await expect(args.api!.logout).not.toHaveBeenCalled();
    await expect(args.api!.leave).not.toHaveBeenCalled();
    await expect(canvas.queryByText("English upstream text")).toBeNull();
    // Still in the dialog and able to retry.
    await expect(submitButton(canvas)).toBeEnabled();
  },
};

/** 409 ACTIVE_CLIENTS: end each relationship first, with the way to the roster. */
export const ActiveClients: Story = {
  args: {
    api: {
      deleteAccount: refusal("ACTIVE_CLIENTS", 409),
      logout: fn(async () => undefined),
      leave: fn(),
    },
  },
  play: async ({ canvas, userEvent, args }) => {
    await fillIn(canvas, userEvent);
    await userEvent.click(submitButton(canvas));
    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent("Você ainda tem alunos ativos");
    await expect(alert).toHaveTextContent(
      "Encerre o acompanhamento de cada aluno antes de excluir sua conta.",
    );
    await expect(within(alert).getByRole("link", { name: "Ver alunos" })).toHaveAttribute(
      "href",
      "/alunos",
    );
    await expect(args.api!.logout).not.toHaveBeenCalled();
  },
};

/** 429 after too many wrong passwords: its own copy, with the wait from Retry-After. */
export const RateLimited: Story = {
  args: {
    api: {
      deleteAccount: refusal("RATE_LIMITED", 429, 600),
      logout: fn(async () => undefined),
      leave: fn(),
    },
  },
  play: async ({ canvas, userEvent }) => {
    await fillIn(canvas, userEvent);
    await userEvent.click(submitButton(canvas));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Muitas tentativas com senha incorreta. Tente novamente em 10 minutos.",
    );
  },
};

/** 204: log out (the proxy doesn't clear the cookie), then leave for /login with the notice. */
export const SuccessLogsOut: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await fillIn(canvas, userEvent);
    await userEvent.click(submitButton(canvas));
    await waitFor(() => expect(args.api!.leave).toHaveBeenCalledWith(ACCOUNT_DELETED_URL));
    await expect(args.api!.deleteAccount).toHaveBeenCalledWith("s3nha-atual");
    await expect(args.api!.logout).toHaveBeenCalledTimes(1);
    // The cookie is cleared before the navigation, or /login would bounce back into the app.
    const [loggedOut] = mocked(args.api!.logout).mock.invocationCallOrder;
    const [left] = mocked(args.api!.leave).mock.invocationCallOrder;
    await expect(loggedOut).toBeLessThan(left);
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

/** A client has no roster: no note about plans written for students. */
export const Client: Story = {
  args: { role: "CLIENT" },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/planos que você escreveu/)).toBeNull();
  },
};
