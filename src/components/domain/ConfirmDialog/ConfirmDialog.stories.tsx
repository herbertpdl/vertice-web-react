import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import { ConfirmDialog } from "./ConfirmDialog";

/** A confirm call that stays in flight until the story releases it. */
let release: () => void = () => {};
const heldConfirm = fn(
  () =>
    new Promise<void>((resolve) => {
      release = resolve;
    }),
);

const meta = {
  component: ConfirmDialog,
  args: {
    title: "Excluir item?",
    children: <p>O item será excluído.</p>,
    confirmLabel: "Excluir",
    onConfirm: heldConfirm,
    errorMessage: () => "Não foi possível excluir.",
    onDone: fn(),
    onClose: fn(),
  },
  beforeEach: () => {
    heldConfirm.mockClear();
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Two activations in the same tick, before React re-renders the button as disabled: the
 * submitting ref, not `pending` state, is what keeps it to one call.
 */
export const SameTickDoubleActivationCallsOnce: Story = {
  play: async ({ args }) => {
    const button = within(document.body).getByRole("button", { name: "Excluir" });
    button.click();
    button.click();
    await expect(heldConfirm).toHaveBeenCalledTimes(1);
    release();
    await waitFor(() => expect(args.onDone).toHaveBeenCalledTimes(1));
    await expect(heldConfirm).toHaveBeenCalledTimes(1);
  },
};

let attempts = 0;
/** Fails the first time, succeeds after. */
const failsOnce = fn(async () => {
  attempts += 1;
  if (attempts === 1) throw new TypeError("Failed to fetch");
});

/** A failure re-arms the guard: the next confirm goes out. */
export const RetryAfterFailure: Story = {
  args: { onConfirm: failsOnce },
  beforeEach: () => {
    attempts = 0;
    failsOnce.mockClear();
  },
  play: async ({ args, userEvent }) => {
    const body = within(document.body);
    await userEvent.click(body.getByRole("button", { name: "Excluir" }));
    await expect(await body.findByRole("alert")).toHaveTextContent("Não foi possível excluir.");
    await expect(args.onDone).not.toHaveBeenCalled();
    await userEvent.click(body.getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(args.onDone).toHaveBeenCalledTimes(1));
    await expect(args.onConfirm).toHaveBeenCalledTimes(2);
  },
};
