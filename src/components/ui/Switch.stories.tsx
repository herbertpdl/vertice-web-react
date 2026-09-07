import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Switch } from "./Switch";

const meta = {
  component: Switch,
  args: { id: "switch", label: "Enable notifications", onChange: () => {} },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = { args: { checked: false } };
export const On: Story = { args: { checked: true } };
export const NoLabel: Story = { args: { label: undefined, checked: true } };
export const Disabled: Story = { args: { checked: false, disabled: true } };
export const DisabledOn: Story = { args: { checked: true, disabled: true } };
