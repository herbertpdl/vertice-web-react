import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Dialog, DialogFooter } from "./Dialog";
import { Button } from "../Button";

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
