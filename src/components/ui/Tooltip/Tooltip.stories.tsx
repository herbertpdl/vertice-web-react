import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";
import { Tooltip } from "./Tooltip";
import { Button } from "../Button";

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

/** Keyboard focus opens it too; `multiline` wraps long content at 320px. */
export const MultilineOnFocus: Story = {
  args: {
    side: "bottom",
    multiline: true,
    content:
      "Manter escápulas retraídas durante todo o movimento. Descer a barra até tocar levemente o peito.",
  },
  play: async ({ canvas }) => {
    canvas.getByRole("button").focus();
    await waitFor(() => expect(canvas.getByRole("tooltip")).toHaveStyle({ opacity: "1" }));
    await expect(canvas.getByRole("tooltip").getBoundingClientRect().width).toBeLessThanOrEqual(320);
  },
};
