import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { FeedbackText } from "./FeedbackText";

const meta = {
  component: FeedbackText,
  args: { text: "Consegui subir 5 kg no agachamento." },
} satisfies Meta<typeof FeedbackText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithComment: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("“Consegui subir 5 kg no agachamento.”")).toBeVisible();
  },
};

/** The client rated the workout and wrote nothing. */
export const RatingOnly: Story = {
  args: { text: "  " },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Sem comentário")).toBeVisible();
  },
};
