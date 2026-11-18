import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { TextArea } from "./TextArea";

const meta = {
  component: TextArea,
  args: {
    id: "reason",
    label: "Motivo",
    required: true,
    placeholder: "Descreva por que esta conta está sendo suspensa",
    helpText: "Obrigatório. Fica registrado no Histórico.",
  },
  decorators: [
    (Story) => (
      <div style={{ width: 440 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

/** `oY0tG`: the placeholder, the required mark and the help line. */
export const Empty: Story = {
  play: async ({ canvas }) => {
    const field = canvas.getByRole("textbox", { name: "Motivo" });
    await expect(field).toHaveAttribute("aria-required", "true");
    await expect(field).toHaveAccessibleDescription("Obrigatório. Fica registrado no Histórico.");
  },
};

/** `mS7wU`: a typed reason. */
export const Filled: Story = {
  args: { defaultValue: "Denúncia de cobrança indevida em análise pelo suporte (ticket #4821)." },
};

export const Focused: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("textbox"));
    await expect(canvas.getByRole("textbox")).toHaveFocus();
  },
};

/** The error replaces the help line and is the field's description. */
export const WithError: Story = {
  args: { defaultValue: "", error: "Informe o motivo" },
  play: async ({ canvas }) => {
    const field = canvas.getByRole("textbox", { name: "Motivo" });
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(field).toHaveAccessibleDescription("Informe o motivo");
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "Denúncia de cobrança indevida em análise pelo suporte." },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox")).toBeDisabled();
  },
};

/** `maxLength` stops typing at the bound (500 for a reason). */
export const MaxLength: Story = {
  args: { maxLength: 10 },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox"), "0123456789extra");
    await expect(canvas.getByRole("textbox")).toHaveValue("0123456789");
  },
};
