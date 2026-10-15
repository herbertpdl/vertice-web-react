import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import { DeleteWorkoutDialog } from "./DeleteWorkoutDialog";
import { ApiError } from "@/lib/api/client";
import { withSeededQueries } from "../storyQuery";

const workout = { id: 42, name: "Treino A — Peito e Costas" };

const meta = {
  component: DeleteWorkoutDialog,
  args: {
    workout,
    planId: 7,
    onClose: fn(),
    onDeleted: fn(),
    api: { remove: fn(async () => undefined) },
  },
  decorators: [withSeededQueries({})],
} satisfies Meta<typeof DeleteWorkoutDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const body = () => within(document.body);
const confirmButton = () => body().getByRole("button", { name: "Excluir treino" });

/** Cancelar (or Escape) closes and deletes nothing. */
export const CancelDoesNothing: Story = {
  play: async ({ userEvent, args }) => {
    await expect(body().getByRole("heading", { name: "Excluir treino?" })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await userEvent.click(body().getByRole("button", { name: "Cancelar" }));
    await expect(args.onClose).toHaveBeenCalledTimes(2);
    await expect(args.api!.remove).not.toHaveBeenCalled();
  },
};

/** Confirm: one DELETE even on a double click, then back to the plan. */
export const ConfirmDeletesOnce: Story = {
  play: async ({ userEvent, args }) => {
    await userEvent.dblClick(confirmButton());
    await waitFor(() => expect(args.onDeleted).toHaveBeenCalledTimes(1));
    await expect(args.api!.remove).toHaveBeenCalledTimes(1);
    await expect(args.api!.remove).toHaveBeenCalledWith(workout.id);
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
      "Este treino já tem registros de um aluno e não pode ser excluído.",
    );
    await expect(args.onDeleted).not.toHaveBeenCalled();
    // Still there, and the trainer can try again.
    await expect(confirmButton()).toBeEnabled();
  },
};
