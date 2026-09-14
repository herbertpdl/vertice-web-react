import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ListRowSkeleton } from "./ListRowSkeleton";

const meta = {
  component: ListRowSkeleton,
} satisfies Meta<typeof ListRowSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const List: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <ListRowSkeleton />
      <ListRowSkeleton />
      <ListRowSkeleton />
    </div>
  ),
};
