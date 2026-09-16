import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SkeletonBlock, SkeletonCircle, SkeletonLine } from "./Skeleton";

const meta = {
  title: "ui/Skeleton",
  component: SkeletonLine,
} satisfies Meta<typeof SkeletonLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = { args: { width: 140, height: 12 } };
export const Circle: Story = { render: () => <SkeletonCircle size={34} /> };
export const Block: Story = { render: () => <SkeletonBlock width={120} height={80} /> };
