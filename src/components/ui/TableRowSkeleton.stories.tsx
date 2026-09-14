import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TableRowSkeleton } from "./TableRowSkeleton";

const meta = {
  component: TableRowSkeleton,
} satisfies Meta<typeof TableRowSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Table: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <TableRowSkeleton />
      <TableRowSkeleton />
      <TableRowSkeleton />
    </div>
  ),
};
