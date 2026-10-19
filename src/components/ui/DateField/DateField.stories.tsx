import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DateField } from "./DateField";

/**
 * `value`/`onChange` are controlled, so every story holds the business date in local state —
 * the same shape `PlanDialog` wires to react-hook-form's `setValue`.
 */
function ControlledDateField({
  value: initialValue = "",
  ...props
}: Partial<React.ComponentProps<typeof DateField>>) {
  const [value, setValue] = useState(initialValue);
  return <DateField label="Início" {...props} value={value} onChange={setValue} />;
}

const meta = {
  component: ControlledDateField,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ width: 260 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ControlledDateField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Filled: Story = { args: { value: "2026-10-31" } };

export const WithHelpText: Story = {
  args: { value: "2026-10-31", helpText: "Primeiro dia do plano." },
};

export const WithError: Story = {
  args: { label: "Término", error: "A data de término deve ser depois da data de início" },
};

export const Bounded: Story = {
  args: {
    label: "Término",
    value: "2026-11-20",
    min: "2026-11-10",
    max: "2026-11-30",
    helpText: "O calendário só oferece os dias entre 10 e 30 de novembro.",
  },
};

export const Disabled: Story = { args: { value: "2026-10-31", disabled: true } };

export const Open: Story = {
  args: { value: "2026-10-31" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("combobox"));
  },
};
