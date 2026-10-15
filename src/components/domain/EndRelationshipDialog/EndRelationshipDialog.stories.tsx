import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { QueryClient } from "@tanstack/react-query";
import { expect, fn, spyOn, waitFor, within } from "storybook/test";
import { EndRelationshipDialog } from "./EndRelationshipDialog";
import { ApiError } from "@/lib/api/client";
import { newStudent } from "../storyFixtures";
import { withSeededQueries } from "../storyQuery";

let client: QueryClient | null = null;

const meta = {
  component: EndRelationshipDialog,
  args: {
    student: newStudent,
    onClose: fn(),
    onEnded: fn(),
    api: { end: fn(async () => undefined) },
  },
  decorators: [
    withSeededQueries(
      {},
      {
        onClient: (seeded) => {
          client = seeded;
        },
      },
    ),
  ],
} satisfies Meta<typeof EndRelationshipDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const body = () => within(document.body);
const confirmButton = () => body().getByRole("button", { name: "Encerrar acompanhamento" });

/** Soft copy: the account stays and the plans are kept. */
export const Copy: Story = {
  play: async () => {
    await expect(body().getByRole("heading", { name: "Encerrar acompanhamento?" })).toBeVisible();
    await expect(body().getByText(/A conta do aluno não é excluída/)).toBeVisible();
    await expect(body().getByText(/os planos que você criou/)).toBeVisible();
  },
};

/** Cancelar closes and calls nothing. */
export const CancelDoesNothing: Story = {
  play: async ({ userEvent, args }) => {
    await userEvent.click(body().getByRole("button", { name: "Cancelar" }));
    await expect(args.onClose).toHaveBeenCalledTimes(1);
    await expect(args.api!.end).not.toHaveBeenCalled();
    await expect(args.onEnded).not.toHaveBeenCalled();
  },
};

/** Confirm: one DELETE (a double click included), the roster refetched, then off to /alunos. */
export const ConfirmEndsOnce: Story = {
  play: async ({ userEvent, args }) => {
    const invalidate = spyOn(client!, "invalidateQueries");
    await userEvent.dblClick(confirmButton());
    await waitFor(() => expect(args.onEnded).toHaveBeenCalledTimes(1));
    await expect(args.api!.end).toHaveBeenCalledTimes(1);
    await expect(args.api!.end).toHaveBeenCalledWith(newStudent.id);
    await expect(invalidate).toHaveBeenCalledWith({ queryKey: ["students"] });
    await expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["student", newStudent.id],
      refetchType: "none",
    });
  },
};

/** 403: the relationship already ended (another tab); pt-BR copy, the dialog stays. */
export const AlreadyEnded: Story = {
  args: {
    api: {
      end: fn(async () => {
        throw new ApiError({ code: "FORBIDDEN", message: "This client is not one of your clients" }, 403);
      }),
    },
  },
  play: async ({ userEvent, args }) => {
    await userEvent.click(confirmButton());
    await expect(await body().findByRole("alert")).toHaveTextContent(
      "O acompanhamento deste aluno já foi encerrado.",
    );
    await expect(body().queryByText(/not one of your clients/)).toBeNull();
    await expect(args.onEnded).not.toHaveBeenCalled();
    await expect(confirmButton()).toBeEnabled();
  },
};
