import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { QueryClient } from "@tanstack/react-query";
import { expect, fn, spyOn, waitFor, within } from "storybook/test";
import { ToastProvider } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { withSeededQueries } from "../storyQuery";
import { AdminEndRelationshipDialog } from "./AdminEndRelationshipDialog";

let client: QueryClient | null = null;

const meta = {
  component: AdminEndRelationshipDialog,
  args: {
    client: { id: 2, name: "Marina Costa" },
    trainer: { id: 1, name: "Ana Ribeiro" },
    onClose: fn(),
    onChanged: fn(),
    api: { end: fn(async () => undefined) },
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
    withSeededQueries({}, { onClient: (seeded) => (client = seeded) }),
  ],
} satisfies Meta<typeof AdminEndRelationshipDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const body = () => within(document.body);
const confirm = () => body().getByRole("button", { name: "Encerrar vínculo" });

/** `x81nY`: no reason asked; both names, the trainer moving to "Treinadores anteriores". */
export const Copy: Story = {
  play: async ({ userEvent, args }) => {
    await expect(body().getByRole("heading", { name: "Encerrar vínculo com o treinador?" })).toBeVisible();
    await expect(body().getByText(/passa para “Treinadores anteriores”/)).toBeVisible();
    await expect(body().queryByRole("textbox")).toBeNull();
    await userEvent.click(body().getByRole("button", { name: "Cancelar" }));
    await expect(args.onClose).toHaveBeenCalledTimes(1);
    await expect(args.api!.end).not.toHaveBeenCalled();
  },
};

/** One DELETE with both ids (a double click included), invalidations, one refetch, the toast. */
export const EndsOnce: Story = {
  play: async ({ userEvent, args }) => {
    const invalidate = spyOn(client!, "invalidateQueries");
    await userEvent.dblClick(confirm());
    await waitFor(() => expect(args.onClose).toHaveBeenCalledTimes(1));
    await expect(args.api!.end).toHaveBeenCalledTimes(1);
    await expect(args.api!.end).toHaveBeenCalledWith(1, 2);
    await expect(args.onChanged).toHaveBeenCalledTimes(1);
    await expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin", "users"] });
    await expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin", "actions"] });
    await expect(await body().findByText("Vínculo entre Marina Costa e Ana Ribeiro encerrado.")).toBeVisible();
  },
};

/** A 404: it ended elsewhere. Closed and refetched, with the "já foi encerrado" toast. */
export const AlreadyEnded: Story = {
  args: {
    api: {
      end: fn(async () => {
        throw new ApiError({ code: "NOT_FOUND", message: "x" }, 404);
      }),
    },
  },
  play: async ({ userEvent, args }) => {
    await userEvent.click(confirm());
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
    await expect(args.onChanged).toHaveBeenCalledTimes(1);
    await expect(await body().findByText("Este vínculo já foi encerrado.")).toBeVisible();
  },
};

/** Other failures stay in the dialog. */
export const Failure: Story = {
  args: {
    api: {
      end: fn(async () => {
        throw new ApiError({ code: "UPSTREAM_UNAVAILABLE", message: "x" }, 503);
      }),
    },
  },
  play: async ({ userEvent, args }) => {
    await userEvent.click(confirm());
    await expect(await body().findByRole("alert")).toHaveTextContent("O serviço está indisponível no momento.");
    await expect(args.onClose).not.toHaveBeenCalled();
    await expect(args.onChanged).not.toHaveBeenCalled();
  },
};
