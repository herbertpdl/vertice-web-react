import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TextField } from "./TextField";

const meta = {
  component: TextField,
  args: { id: "field", label: "Email", placeholder: "you@example.com" },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Filled: Story = { args: { defaultValue: "coach@vertice.app" } };
export const WithHelpText: Story = {
  args: { helpText: "We'll never share your email." },
};
export const WithError: Story = {
  args: { defaultValue: "invalid-email", error: "Enter a valid email address." },
};
export const Disabled: Story = { args: { disabled: true, defaultValue: "coach@vertice.app" } };

export const Focused: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("textbox"));
  },
};
