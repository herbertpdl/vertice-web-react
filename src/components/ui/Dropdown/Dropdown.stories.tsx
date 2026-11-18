import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Dropdown } from "./Dropdown";

const options = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "quarter", label: "This quarter" },
  { value: "year", label: "This year" },
];

const meta = {
  component: Dropdown,
  args: { label: "Period", options },
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {};
export const Selected: Story = { args: { value: "month" } };
export const Disabled: Story = { args: { disabled: true } };

export const Open: Story = {
  args: { value: "month" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
  },
};

export const Compact: Story = {
  args: { size: "compact", label: undefined, value: "month" },
};

/** The table footer's "Linhas por página" select (`ETgH1`): 6/10 padding, 12 px, md radius. */
export const Small: Story = {
  args: { size: "sm", label: undefined, value: "month", className: "w-[120px]" },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button");
    await expect(getComputedStyle(trigger).paddingTop).toBe("6px");
    await expect(getComputedStyle(trigger).borderTopLeftRadius).toBe("10px");
  },
};
