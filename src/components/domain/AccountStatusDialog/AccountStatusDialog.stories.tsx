import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { QueryClient } from "@tanstack/react-query";
import { expect, fn, spyOn, waitFor, within } from "storybook/test";
import { ToastProvider } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { withSeededQueries } from "../storyQuery";
import { AccountStatusDialog } from "./AccountStatusDialog";

let client: QueryClient | null = null;
const user = { id: 1, name: "Ana Ribeiro", role: "TRAINER" as const };
const done = { user: { id: 1 } } as never;

const meta = {
  component: AccountStatusDialog,
  args: {
    action: "suspend",
    user,
    onClose: fn(),
    onChanged: fn(),
    api: { suspend: fn(async () => done), reactivate: fn(async () => done) },
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
    withSeededQueries({}, { onClient: (seeded) => (client = seeded) }),
  ],
} satisfies Meta<typeof AccountStatusDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const body = () => within(document.body);
const reason = () => body().getByRole("textbox", { name: "Motivo" });

/** `oY0tG`: "Suspender" stays disabled while the reason is empty or blank (E20). */
export const SuspendEmpty: Story = {
  play: async ({ userEvent, args }) => {
    await expect(body().getByRole("heading", { name: "Suspender Ana Ribeiro?" })).toBeVisible();
    await expect(body().getByText(/Os dados da conta e dos alunos são mantidos/)).toBeVisible();
    await expect(body().getByRole("button", { name: "Suspender" })).toBeDisabled();
    await userEvent.type(reason(), "   ");
    await expect(body().getByRole("button", { name: "Suspender" })).toBeDisabled();
    await userEvent.click(body().getByRole("button", { name: "Cancelar" }));
    await expect(args.onClose).toHaveBeenCalledTimes(1);
    await expect(args.api!.suspend).not.toHaveBeenCalled();
  },
};

/**
 * `mS7wU`: a reason enables it. One request with the trimmed reason, the directory and the history
 * invalidated, one profile refetch, a toast, closed.
 */
export const SuspendFilled: Story = {
  play: async ({ userEvent, args }) => {
    const invalidate = spyOn(client!, "invalidateQueries");
    await userEvent.type(reason(), "  Denúncia de cobrança indevida (ticket #4821).  ");
    await userEvent.dblClick(body().getByRole("button", { name: "Suspender" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalledTimes(1));
    await expect(args.api!.suspend).toHaveBeenCalledTimes(1);
    await expect(args.api!.suspend).toHaveBeenCalledWith(1, "Denúncia de cobrança indevida (ticket #4821).");
    await expect(args.onChanged).toHaveBeenCalledTimes(1);
    await expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin", "users"] });
    await expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin", "actions"] });
    await expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["admin"] });
    await expect(await body().findByText("A conta de Ana Ribeiro foi suspensa.")).toBeVisible();
  },
};

/** A client's account has no "alunos" to keep. */
export const SuspendClient: Story = {
  args: { user: { id: 2, name: "Marina Costa", role: "CLIENT" } },
  play: async () => {
    await expect(body().getByText(/Os dados da conta são mantidos/)).toBeVisible();
  },
};

/** `HCHVB` / `GOUMA`: "Reativar", the primary button, the same required reason. */
export const Reactivate: Story = {
  args: { action: "reactivate" },
  play: async ({ userEvent, args }) => {
    await expect(body().getByRole("heading", { name: "Reativar Ana Ribeiro?" })).toBeVisible();
    await expect(body().getByRole("button", { name: "Reativar" })).toBeDisabled();
    await userEvent.type(reason(), "Suporte confirmou a regularização.");
    await userEvent.click(body().getByRole("button", { name: "Reativar" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
    await expect(args.api!.reactivate).toHaveBeenCalledWith(1, "Suporte confirmou a regularização.");
    await expect(await body().findByText("A conta de Ana Ribeiro foi reativada.")).toBeVisible();
  },
};

/** A 409: someone changed the status first. Close, refetch the profile, say so. */
export const AlreadyChanged: Story = {
  args: {
    api: {
      suspend: fn(async () => {
        throw new ApiError({ code: "PRECONDITION_FAILED", message: "x" }, 409);
      }),
      reactivate: fn(async () => done),
    },
  },
  play: async ({ userEvent, args }) => {
    await userEvent.type(reason(), "Motivo");
    await userEvent.click(body().getByRole("button", { name: "Suspender" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
    await expect(args.onChanged).toHaveBeenCalledTimes(1);
    await expect(await body().findByText("O status desta conta já tinha mudado.")).toBeVisible();
  },
};

/** Any other failure stays in the dialog, the reason kept, and can be retried. */
export const Failure: Story = {
  args: {
    api: {
      suspend: fn(async () => {
        throw new ApiError({ code: "UPSTREAM_UNAVAILABLE", message: "x" }, 503);
      }),
      reactivate: fn(async () => done),
    },
  },
  play: async ({ userEvent, args }) => {
    await userEvent.type(reason(), "Motivo");
    await userEvent.click(body().getByRole("button", { name: "Suspender" }));
    await expect(await body().findByRole("alert")).toHaveTextContent("O serviço está indisponível no momento.");
    await expect(reason()).toHaveValue("Motivo");
    await expect(body().getByRole("button", { name: "Suspender" })).toBeEnabled();
    await expect(args.onClose).not.toHaveBeenCalled();
    await expect(args.onChanged).not.toHaveBeenCalled();
  },
};

/** Over 500 UTF-16 units: the field says so and the button stays disabled. */
export const ReasonTooLong: Story = {
  play: async ({ userEvent }) => {
    reason().focus();
    await userEvent.paste("a".repeat(501));
    await expect(reason()).toHaveAccessibleDescription("Use no máximo 500 caracteres");
    await expect(body().getByRole("button", { name: "Suspender" })).toBeDisabled();
  },
};
