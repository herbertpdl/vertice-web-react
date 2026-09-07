import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MetricCard } from "./MetricCard";

const meta = {
  component: MetricCard,
  args: { label: "Active clients", value: "128" },
} satisfies Meta<typeof MetricCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TrendUp: Story = { args: { trend: "up", delta: "+12% vs last month" } };
export const TrendDown: Story = {
  args: { value: "42", trend: "down", delta: "-4% vs last month" },
};
export const TrendNeutral: Story = { args: { trend: "neutral" } };
export const NoDelta: Story = { args: { delta: undefined } };
export const Loading: Story = { args: { loading: true } };
