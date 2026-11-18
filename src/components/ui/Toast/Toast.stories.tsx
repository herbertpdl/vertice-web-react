import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import { Button } from "../Button";
import { Toast, ToastProvider, useToast } from "./Toast";

const meta = {
  component: Toast,
  args: { message: "E-mail de redefinição de senha enviado para marina.costa@email.com.", onClose: fn() },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {};

export const ErrorTone: Story = {
  args: { tone: "error", message: "Não foi possível enviar o e-mail. Tente novamente." },
};

/** The close button. */
export const Closes: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Fechar aviso" }));
    await expect(args.onClose).toHaveBeenCalled();
  },
};

function Trigger() {
  const show = useToast();
  return <Button onClick={() => show({ message: "Ana Ribeiro foi suspensa." })}>Mostrar</Button>;
}

/** `useToast` inside a `ToastProvider`: announced in a polite live region, closed by its button. */
export const FromProvider: Story = {
  render: () => (
    <ToastProvider>
      <Trigger />
    </ToastProvider>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mostrar" }));
    const body = within(document.body);
    const region = await body.findByRole("status");
    await expect(region).toHaveAttribute("aria-live", "polite");
    await expect(within(region).getByText("Ana Ribeiro foi suspensa.")).toBeVisible();
    await userEvent.click(within(region).getByRole("button", { name: "Fechar aviso" }));
    await waitFor(() => expect(within(region).queryByText("Ana Ribeiro foi suspensa.")).toBeNull());
  },
};
