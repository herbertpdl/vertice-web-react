import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProfileMenu } from "./ProfileMenu";

const meta = {
  component: ProfileMenu,
  args: { name: "Herbert Lago", email: "herbert@vertice.app" },
} satisfies Meta<typeof ProfileMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const LongEmail: Story = {
  args: { email: "herbert.lago+coaching-account@vertice-coach.app" },
};
