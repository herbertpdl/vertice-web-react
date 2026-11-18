import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Users } from "lucide-react";
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

/** A fixed icon in the primary color instead of the trend arrow (the admin dashboard). */
export const WithIcon: Story = { args: { label: "Alunos", value: "1.942", icon: Users } };

/** A custom body in place of the value. */
export const CustomBody: Story = {
  args: {
    label: "Treinos concluídos",
    icon: Users,
    children: <span className="text-[color:var(--color-text-primary)]">7 dias · 30 dias</span>,
  },
};
