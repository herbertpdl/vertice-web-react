import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Meta, StoryContext, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import { ApiError } from "@/lib/api/client";
import { ChangePasswordDialog } from "./ChangePasswordDialog";

const meta = {
  component: ChangePasswordDialog,
  args: { onClose: fn(), onChanged: fn(), submit: fn(async () => undefined) },
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <Story />
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof ChangePasswordDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

async function fill({ userEvent }: StoryContext, current = "senha-atual", next = "nova-senha-1", confirm = next) {
  const dialog = within(document.body);
  await userEvent.type(dialog.getByLabelText("Senha atual"), current);
  await userEvent.type(dialog.getByLabelText("Nova senha"), next);
  await userEvent.type(dialog.getByLabelText("Confirmar nova senha"), confirm);
  await userEvent.click(dialog.getByRole("button", { name: "Salvar nova senha" }));
}

export const Empty: Story = {};

/** Success: only the two passwords are sent, then the caller signs out (E42). */
export const Changed: Story = {
  play: async (context) => {
    await fill(context);
    await waitFor(() => expect(context.args.onChanged).toHaveBeenCalled());
    await expect(context.args.submit).toHaveBeenCalledWith({ currentPassword: "senha-atual", newPassword: "nova-senha-1" });
  },
};

export const Mismatch: Story = {
  play: async (context) => {
    await fill(context, "senha-atual", "nova-senha-1", "outra-senha-1");
    await expect(await within(document.body).findByText("As senhas não coincidem")).toBeVisible();
    await expect(context.args.submit).not.toHaveBeenCalled();
  },
};

/** A wrong current password is a field error, not a sign-out. */
export const WrongCurrentPassword: Story = {
  args: {
    submit: fn(async () => {
      throw new ApiError({ code: "INVALID_CURRENT_PASSWORD", message: "Wrong" }, 400);
    }),
  },
  play: async (context) => {
    await fill(context);
    await expect(await within(document.body).findByText("Senha atual incorreta.")).toBeVisible();
    await expect(context.args.onChanged).not.toHaveBeenCalled();
  },
};

export const RateLimited: Story = {
  args: {
    submit: fn(async () => {
      throw new ApiError({ code: "RATE_LIMITED", message: "Too many" }, 429, 120);
    }),
  },
  play: async (context) => {
    await fill(context);
    await expect(await within(document.body).findByRole("alert")).toHaveTextContent(
      "Muitas tentativas. Tente novamente em 2 minutos.",
    );
  },
};
