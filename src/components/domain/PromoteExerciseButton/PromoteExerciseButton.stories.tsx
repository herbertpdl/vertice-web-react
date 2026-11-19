import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { PromoteExerciseButton } from "./PromoteExerciseButton";

const meta = {
  component: PromoteExerciseButton,
  args: { exerciseName: "Elevação pélvica com pausa", onClick: fn() },
} satisfies Meta<typeof PromoteExerciseButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** `iiou2`: the catalog's "Promover ao catálogo", named after the exercise for a screen reader. */
export const Catalog: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const button = canvas.getByRole("button", { name: "Promover Elevação pélvica com pausa ao catálogo" });
    await expect(button).toHaveTextContent("Promover ao catálogo");
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

/** `En3Ju`: the dashboard table's shorter "Promover". */
export const Short: Story = {
  args: { label: "Promover" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /ao catálogo/ })).toHaveTextContent("Promover");
  },
};

/** `qzCk9`: the phone list's plain-text "Promover". */
export const Link: Story = {
  args: { label: "Promover", variant: "link" },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Promover Elevação pélvica com pausa ao catálogo" }));
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};
