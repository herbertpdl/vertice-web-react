import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useSearchParams } from "@storybook/nextjs-vite/navigation.mock";
import { expect } from "storybook/test";
import { AlunosContent } from "./AlunosContent";
import { roster } from "@/components/domain/storyFixtures";
import { withSeededQueries } from "@/components/domain/storyQuery";

const meta = {
  component: AlunosContent,
  // `roster` still carries the deprecated `email` the BFF sends, so these prove it is ignored.
  decorators: [withSeededQueries({ '["students"]': roster })],
  // Pages-router decorator plus a stubbed `useSearchParams`: see WorkoutEditorSession.stories.tsx
  // for why not `nextjs: { appDirectory: true }` on Storybook 10.6 + Next 16.4.
  beforeEach: () => {
    useSearchParams.mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>,
    );
  },
} satisfies Meta<typeof AlunosContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Each row shows the name, never the email (P1-03: the roster carries no personal data). */
export const RowsWithoutEmail: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Marina Costa")).toBeVisible();
    await expect(canvas.getByText("Rafael Souza")).toBeVisible();
    for (const student of roster) {
      await expect(canvas.queryByText(student.email)).toBeNull();
    }
    await expect(canvas.getByPlaceholderText("Buscar por nome...")).toBeVisible();
  },
};

/** Search matches names only: an email (or a piece of one) finds nobody. */
export const SearchByNameOnly: Story = {
  play: async ({ canvas, userEvent }) => {
    const search = canvas.getByPlaceholderText("Buscar por nome...");
    await userEvent.type(search, "rafa.souza@");
    await expect(canvas.getByText("Nenhum aluno encontrado")).toBeVisible();

    await userEvent.clear(search);
    await userEvent.type(search, "marina");
    await expect(canvas.getByText("Marina Costa")).toBeVisible();
    await expect(canvas.queryByText("Rafael Souza")).toBeNull();
  },
};
