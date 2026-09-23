import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { AddExerciseDialog } from "./AddExerciseDialog";
import { catalog, muscleGroups } from "../storyFixtures";
import { withSeededQueries } from "../storyQuery";
import { exercisesQueryKey } from "@/lib/api/exercises";
import { muscleGroupsQueryKey } from "@/lib/api/muscleGroups";

const meta = {
  component: AddExerciseDialog,
  args: { onClose: fn(), onPick: fn() },
  decorators: [
    withSeededQueries({
      [JSON.stringify(exercisesQueryKey({}))]: catalog,
      [JSON.stringify(muscleGroupsQueryKey)]: muscleGroups,
    }),
  ],
} satisfies Meta<typeof AddExerciseDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Adicionar Crucifixo na Polia" }));
    await expect(args.onPick).toHaveBeenCalledWith(catalog[4]);
    await expect(args.onClose).toHaveBeenCalled();
  },
};

export const CapReached: Story = {
  args: { atCap: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("Este treino já tem 20 exercícios — o máximo permitido"),
    ).toBeVisible();
    for (const button of canvas.getAllByRole("button", { name: /^Adicionar / })) {
      await expect(button).toBeDisabled();
    }
  },
};
