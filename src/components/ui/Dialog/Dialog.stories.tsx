import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import { Dialog, DialogFooter } from "./Dialog";
import { Button } from "../Button";
import { TextField } from "../TextField";

const meta = {
  component: Dialog,
  args: {
    title: "Delete client",
    onClose: () => {},
    children: null,
  },
  render: (args) => (
    <Dialog {...args}>
      <p style={{ fontSize: 14 }}>
        This action cannot be undone. The client and all associated data will be permanently
        removed.
      </p>
      <DialogFooter>
        <Button variant="ghost">Cancel</Button>
        <Button variant="danger">Delete</Button>
      </DialogFooter>
    </Dialog>
  ),
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Wide: Story = { args: { width: 640 } };

const closeSpy = fn();

/** A form whose parent re-renders on each keystroke, passing a new inline `onClose` every time. */
function InlineOnCloseForm() {
  const [name, setName] = useState("");
  return (
    <Dialog title="Editar" onClose={() => closeSpy(name)}>
      <TextField label="Nome" value={name} onChange={(event) => setName(event.target.value)} />
    </Dialog>
  );
}

/**
 * A new `onClose` each render must not re-run the focus effect: typing stays in the field (it used
 * to jump to "Fechar" after each keystroke), and Escape calls the latest `onClose`.
 */
export const InlineOnCloseKeepsFocus: Story = {
  render: () => <InlineOnCloseForm />,
  beforeEach: () => {
    closeSpy.mockClear();
  },
  play: async ({ userEvent }) => {
    const field = within(document.body).getByLabelText("Nome");
    await userEvent.click(field);
    await userEvent.type(field, "Ana");
    await expect(field).toHaveValue("Ana");
    await expect(field).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect(closeSpy).toHaveBeenCalledWith("Ana");
  },
};
