import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { createEvent, expect, fireEvent, fn } from "storybook/test";
import { SetRow } from "./SetRow";
import { set } from "../storyFixtures";

const meta = {
  component: SetRow,
  args: {
    set: set({ id: 102, reps: 8, weight: "60", loadPercentage: "75", restSeconds: 90 }),
    setNumber: 2,
    onUpdate: fn(),
    onDuplicate: fn(),
    onRemove: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 900 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SetRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const reps = canvas.getByLabelText("Reps da série 2");
    await userEvent.clear(reps);
    await userEvent.type(reps, "10");
    await expect(args.onUpdate).toHaveBeenLastCalledWith({ reps: 10 });
    // A non-numeric value is flagged and never committed.
    await userEvent.type(reps, "x");
    await expect(reps).toHaveAttribute("aria-invalid", "true");
  },
};
export const Empty: Story = { args: { set: set({ strategy: "DROPSET" }), setNumber: 3 } };
export const Dragging: Story = { args: { dragging: true } };

/** 💬 opens the strategy's description; empty, it shows the default the client would see. */
export const DescriptionToggle: Story = {
  args: { set: set({ id: 104, strategy: "FAILURE" }) },
  play: async ({ canvas, userEvent, args }) => {
    const toggle = canvas.getByRole("button", { name: "Descrição da estratégia da série 2" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    const field = canvas.getByLabelText(/Descrição da estratégia/, { selector: "textarea" });
    await expect(field).toHaveAttribute(
      "placeholder",
      "Padrão: Faça repetições até não conseguir completar mais nenhuma com boa técnica.",
    );
    await expect(canvas.getByText("Vazio: o aluno vê a descrição padrão de Falha.")).toBeVisible();
    await userEvent.type(field, "P");
    await expect(args.onUpdate).toHaveBeenLastCalledWith({ notes: "P" });
  },
};

/** A dragged set dropped on the description never types its key into it (it would be saved). */
export const DropOnDescription: Story = {
  args: { set: set({ id: 106, strategy: "DROPSET", notes: "Tire 10 kg." }) },
  play: async ({ canvas, args }) => {
    const field = canvas.getByLabelText("Descrição da estratégia da série 2 (opcional)", { selector: "textarea" });
    const drop = createEvent.drop(field);
    fireEvent(field, drop);
    await expect(drop.defaultPrevented).toBe(true);
    await expect(args.onUpdate).not.toHaveBeenCalled();
  },
};

/** A set with a description opens with it showing; clearing it sends no notes. */
export const WithDescription: Story = {
  args: { set: set({ id: 105, strategy: "DROPSET", notes: "Tire 10 kg duas vezes, sem descanso." }) },
  play: async ({ canvas, userEvent, args }) => {
    const field = canvas.getByLabelText(/Descrição da estratégia/, { selector: "textarea" });
    await expect(field).toHaveValue("Tire 10 kg duas vezes, sem descanso.");
    await expect(canvas.getByText("36/255")).toBeVisible();
    await userEvent.clear(field);
    await expect(args.onUpdate).toHaveBeenLastCalledWith({ notes: undefined });
  },
};
export const Refused: Story = {
  args: { refused: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("Remoção desfeita — desempenho registrado por um aluno"),
    ).toBeVisible();
  },
};
export const DuplicateDisabled: Story = {
  args: { duplicateDisabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Duplicar série 2" })).toBeDisabled();
  },
};

/** Values vertice-api would refuse are flagged and never committed (they would undo the batch). */
export const OutOfRange: Story = {
  args: { set: set({ id: 103 }) },
  play: async ({ canvas, userEvent, args }) => {
    const reps = canvas.getByLabelText("Reps da série 2");
    await userEvent.type(reps, "1001");
    await expect(reps).toHaveAttribute("aria-invalid", "true");
    await expect(args.onUpdate).not.toHaveBeenCalledWith({ reps: 1001 });

    const weight = canvas.getByLabelText("Peso da série 2");
    await userEvent.type(weight, "12345");
    await expect(weight).toHaveAttribute("aria-invalid", "true");
    await expect(args.onUpdate).not.toHaveBeenCalledWith({ weight: "12345" });

    await userEvent.clear(weight);
    await userEvent.type(weight, "82,5");
    await expect(weight).toHaveAttribute("aria-invalid", "false");
    await expect(args.onUpdate).toHaveBeenLastCalledWith({ weight: "82.5" });
  },
};
