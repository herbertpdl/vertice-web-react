import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { RoleBadge, StatusBadge } from "./UserBadges";

const meta = {
  component: RoleBadge,
  args: { role: "TRAINER" },
} satisfies Meta<typeof RoleBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = {
  render: () => (
    <div className="flex gap-[6px]">
      <RoleBadge role="TRAINER" />
      <RoleBadge role="CLIENT" />
      <StatusBadge suspended={false} />
      <StatusBadge suspended />
    </div>
  ),
  play: async ({ canvas }) => {
    for (const text of ["Treinador", "Aluno", "Ativo", "Suspenso"]) {
      await expect(canvas.getByText(text)).toBeVisible();
    }
  },
};
