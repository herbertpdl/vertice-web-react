import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import { DeletePlanDialog } from "./DeletePlanDialog";
import { ApiError } from "@/lib/api/client";
import { withSeededQueries } from "../storyQuery";

const plan = { id: 7, name: "Hipertrofia — Fase 1", clientId: 3 };

const meta = {
  component: DeletePlanDialog,
  args: {
    plan,
    onClose: fn(),
    onDeleted: fn(),
    api: { remove: fn(async () => undefined) },
  },
  decorators: [withSeededQueries({})],
} satisfies Meta<typeof DeletePlanDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const body = () => within(document.body);
const confirmButton = () => body().getByRole("button", { name: "Excluir plano" });

/** Cancelar closes and deletes nothing. */
export const CancelDoesNothing: Story = {
  play: async ({ userEvent, args }) => {
    await expect(body().getByRole("heading", { name: "Excluir plano?" })).toBeVisible();
    await userEvent.click(body().getByRole("button", { name: "Cancelar" }));
    await expect(args.onClose).toHaveBeenCalledTimes(1);
    await expect(args.api!.remove).not.toHaveBeenCalled();
  },
};

/** Confirm: one DELETE even on a double click, then back to the student. */
export const ConfirmDeletesOnce: Story = {
  play: async ({ userEvent, args }) => {
    await userEvent.dblClick(confirmButton());
    await waitFor(() => expect(args.onDeleted).toHaveBeenCalledTimes(1));
    await expect(args.api!.remove).toHaveBeenCalledTimes(1);
    await expect(args.api!.remove).toHaveBeenCalledWith(plan.id);
  },
};

/** 409 PRECONDITION_FAILED: a client recorded training under it; its own pt-BR copy. */
export const RecordedTraining: Story = {
  args: {
    api: {
      remove: fn(async () => {
        throw new ApiError(
          { code: "PRECONDITION_FAILED", message: "The resource's current state does not allow this request" },
          409,
        );
      }),
    },
  },
  play: async ({ userEvent, args }) => {
    await userEvent.click(confirmButton());
    await expect(await body().findByRole("alert")).toHaveTextContent(
      "Este plano já tem treinos registrados e não pode ser excluído.",
    );
    await expect(args.onDeleted).not.toHaveBeenCalled();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};
