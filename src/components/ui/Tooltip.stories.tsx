import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Tooltip } from "./Tooltip";
import { Button } from "./Button";

const meta = {
  component: Tooltip,
  args: { content: "Helpful tooltip text", side: "top", children: null },
  render: (args) => (
    <div style={{ padding: 48 }}>
      <Tooltip {...args}>
        <Button>Hover me</Button>
      </Tooltip>
    </div>
  ),
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hidden: Story = {};

export const Top: Story = {
  args: { side: "top" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(canvas.getByRole("button"));
  },
};
export const Bottom: Story = {
  args: { side: "bottom" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(canvas.getByRole("button"));
  },
};
export const Left: Story = {
  args: { side: "left" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(canvas.getByRole("button"));
  },
};
export const Right: Story = {
  args: { side: "right" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(canvas.getByRole("button"));
  },
};
