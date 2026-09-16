import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Checkbox } from "./Checkbox";

const meta = {
  component: Checkbox,
  args: { id: "checkbox", label: "Remember me", onChange: () => {} },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = { args: { checked: false } };
export const Checked: Story = { args: { checked: true } };
export const NoLabel: Story = { args: { label: undefined, checked: true } };
export const Disabled: Story = { args: { checked: false, disabled: true } };
export const DisabledChecked: Story = { args: { checked: true, disabled: true } };
