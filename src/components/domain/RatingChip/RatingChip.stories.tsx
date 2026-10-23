import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { RATING_ORDER } from "@/lib/feedback";
import { RatingChip, ReplacedSessionTag } from "./RatingChip";

const meta = {
  component: RatingChip,
  args: { rating: "HARD" },
} satisfies Meta<typeof RatingChip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Read as one label; the face is decorative. */
export const Hard: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("img", { name: "Avaliação: Difícil" })).toBeVisible();
  },
};

/** The five faces of the client's scale, hardest first. */
export const AllRatings: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      {RATING_ORDER.map((rating) => (
        <RatingChip key={rating} rating={rating} />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("img")).toHaveLength(5);
    await expect(canvas.getByRole("img", { name: "Avaliação: Muito fácil" })).toBeVisible();
  },
};

export const Replaced: Story = {
  render: () => <ReplacedSessionTag />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Sessão substituída")).toBeVisible();
  },
};
