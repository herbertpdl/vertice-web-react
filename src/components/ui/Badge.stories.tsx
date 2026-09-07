import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge, type BadgeVariant } from "./Badge";

const meta = {
  component: Badge,
  args: { children: "Badge" },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "success", "danger", "neutral"] satisfies BadgeVariant[],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: "primary" } };
export const Success: Story = { args: { variant: "success" } };
export const Danger: Story = { args: { variant: "danger" } };
export const Neutral: Story = { args: { variant: "neutral" } };

export const AllVariants: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: 8 }}>
      {(["primary", "success", "danger", "neutral"] satisfies BadgeVariant[]).map((variant) => (
        <Badge key={variant} {...args} variant={variant}>
          {variant}
        </Badge>
      ))}
    </div>
  ),
};
