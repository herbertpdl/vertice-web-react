import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Spinner, type SpinnerSize } from "./Spinner";

const meta = {
  component: Spinner,
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] satisfies SpinnerSize[] },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = { args: { size: "sm" } };
export const Medium: Story = { args: { size: "md" } };
export const Large: Story = { args: { size: "lg" } };
