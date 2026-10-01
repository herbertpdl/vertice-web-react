import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import { MultiSelect } from "./MultiSelect";

// The 14 launch muscle groups, in id order (GET /muscle-groups).
const options = [
  "Peito",
  "Costas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Antebraço",
  "Quadríceps",
  "Posteriores de coxa",
  "Glúteos",
  "Panturrilhas",
  "Abdômen",
  "Lombar",
  "Trapézio",
  "Cardio",
].map((label, i) => ({ value: String(i + 1), label }));

const meta = {
  component: MultiSelect,
  args: {
    label: "Grupos musculares",
    placeholder: "Selecione os grupos",
    options,
    value: [],
    onChange: fn(),
  },
  // Controlled by local state so toggling is visible; `onChange` still records every call.
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <div style={{ width: 400 }}>
        <MultiSelect
          {...args}
          value={value}
          onChange={(next) => {
            setValue(next);
            args.onChange(next);
          }}
        />
      </div>
    );
  },
} satisfies Meta<typeof MultiSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /Grupos musculares/ })).toHaveTextContent(
      "Selecione os grupos",
    );
  },
};

export const Selected: Story = {
  args: { value: ["5", "1"] },
  play: async ({ canvas }) => {
    // Labels follow option order, not the order of `value`.
    await expect(canvas.getByRole("button", { name: /Grupos musculares/ })).toHaveTextContent(
      "Peito, Tríceps",
    );
  },
};

export const Open: Story = {
  args: { value: ["1", "5"] },
  play: async ({ canvas, userEvent, args }) => {
    const body = within(document.body);
    await userEvent.click(canvas.getByRole("button", { name: /Grupos musculares/ }));
    const listbox = await body.findByRole("listbox");
    await expect(listbox).toBeVisible();
    await expect(listbox).toHaveAttribute("aria-multiselectable", "true");
    await userEvent.click(body.getByRole("option", { name: "Costas" }));
    await expect(args.onChange).toHaveBeenCalledWith(["1", "2", "5"]);
    await expect(body.getByRole("listbox")).toBeVisible();
    await expect(body.getByRole("option", { name: "Costas" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  },
};

export const KeyboardToggle: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const body = within(document.body);
    const trigger = canvas.getByRole("button", { name: /Grupos musculares/ });
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await body.findByRole("listbox");
    await waitFor(() => expect(body.getByRole("option", { name: "Peito" })).toHaveFocus());
    await userEvent.keyboard(" ");
    await expect(args.onChange).toHaveBeenCalledWith(["1"]);
    await expect(body.getByRole("listbox")).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("listbox")).toBeNull());
    await expect(trigger).toHaveFocus();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /Grupos musculares/ })).toBeDisabled();
  },
};

export const WithError: Story = {
  args: { error: "Selecione pelo menos um grupo muscular" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Selecione pelo menos um grupo muscular")).toBeVisible();
  },
};
