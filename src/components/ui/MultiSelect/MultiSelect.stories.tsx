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

type Canvas = ReturnType<typeof within>;

const trigger = (canvas: Canvas) =>
  canvas.getByRole("button", { name: "Grupos musculares" });

const tagLabels = (canvas: Canvas) =>
  within(canvas.getByRole("list", { name: "Selecionados" }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

export const Placeholder: Story = {
  play: async ({ canvas }) => {
    await expect(trigger(canvas)).toHaveTextContent("Selecione os grupos");
    await expect(
      canvas.queryByRole("list", { name: "Selecionados" }),
    ).toBeNull();
  },
};

export const Selected: Story = {
  args: { value: ["5", "1"] },
  play: async ({ canvas }) => {
    // The field keeps the placeholder; the selection is the tag row above it,
    // in option order rather than the order of `value`.
    await expect(trigger(canvas)).toHaveTextContent("Selecione os grupos");
    await expect(tagLabels(canvas)).toEqual(["Peito", "Tríceps"]);
    await expect(
      canvas.getByRole("button", { name: "Remover Peito" }),
    ).toBeVisible();
  },
};

export const RemoveViaTag: Story = {
  args: { value: ["1", "2", "5"] },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Remover Costas" }),
    );
    await expect(args.onChange).toHaveBeenCalledWith(["1", "5"]);
    await expect(tagLabels(canvas)).toEqual(["Peito", "Tríceps"]);
  },
};

export const RemoveLastTag: Story = {
  args: { value: ["1"] },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Remover Peito" }),
    );
    await expect(args.onChange).toHaveBeenCalledWith([]);
    await expect(
      canvas.queryByRole("list", { name: "Selecionados" }),
    ).toBeNull();
  },
};

export const KeyboardRemoveMovesFocus: Story = {
  args: { value: ["1", "2", "5"] },
  play: async ({ canvas, userEvent }) => {
    // Next tag, else the previous one, else the field.
    canvas.getByRole("button", { name: "Remover Costas" }).focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Remover Tríceps" }),
      ).toHaveFocus(),
    );
    await userEvent.keyboard(" ");
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Remover Peito" }),
      ).toHaveFocus(),
    );
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(trigger(canvas)).toHaveFocus());
    await expect(
      canvas.queryByRole("list", { name: "Selecionados" }),
    ).toBeNull();
  },
};

export const RemoveViaMenu: Story = {
  args: { value: ["1", "5"] },
  play: async ({ canvas, userEvent, args }) => {
    const body = within(document.body);
    await userEvent.click(trigger(canvas));
    await userEvent.click(await body.findByRole("option", { name: "Peito" }));
    await expect(args.onChange).toHaveBeenCalledWith(["5"]);
    await expect(tagLabels(canvas)).toEqual(["Tríceps"]);
    await userEvent.click(body.getByRole("option", { name: "Costas" }));
    await expect(tagLabels(canvas)).toEqual(["Costas", "Tríceps"]);
  },
};

export const RemoveTagWhileOpen: Story = {
  args: { value: ["1", "5"] },
  play: async ({ canvas, userEvent, args }) => {
    const body = within(document.body);
    await userEvent.click(trigger(canvas));
    await body.findByRole("listbox");
    await userEvent.click(
      canvas.getByRole("button", { name: "Remover Peito" }),
    );
    await expect(args.onChange).toHaveBeenCalledWith(["5"]);
    await expect(body.getByRole("listbox")).toBeVisible();
    await expect(body.getByRole("option", { name: "Peito" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    // The menu stays anchored to the trigger, which moved as the tag row changed.
    await userEvent.click(
      canvas.getByRole("button", { name: "Remover Tríceps" }),
    );
    await waitFor(() =>
      expect(
        Math.round(body.getByRole("listbox").getBoundingClientRect().top),
      ).toBe(Math.round(trigger(canvas).getBoundingClientRect().bottom)),
    );
  },
};

export const ManyTagsWrap: Story = {
  args: { value: options.map((o) => o.value) },
  play: async ({ canvas }) => {
    const list = canvas.getByRole("list", { name: "Selecionados" });
    await expect(tagLabels(canvas)).toHaveLength(options.length);
    await expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth);
    const tops = new Set(
      within(list)
        .getAllByRole("listitem")
        .map((item) => Math.round(item.getBoundingClientRect().top)),
    );
    await expect(tops.size).toBeGreaterThan(1);
  },
};

export const Open: Story = {
  args: { value: ["1", "5"] },
  play: async ({ canvas, userEvent, args }) => {
    const body = within(document.body);
    await userEvent.click(
      canvas.getByRole("button", { name: /Grupos musculares/ }),
    );
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
    await waitFor(() =>
      expect(body.getByRole("option", { name: "Peito" })).toHaveFocus(),
    );
    await userEvent.keyboard(" ");
    await expect(args.onChange).toHaveBeenCalledWith(["1"]);
    await expect(body.getByRole("listbox")).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("listbox")).toBeNull());
    await expect(trigger).toHaveFocus();
  },
};

export const Disabled: Story = {
  args: { disabled: true, value: ["1", "5"] },
  play: async ({ canvas }) => {
    await expect(trigger(canvas)).toBeDisabled();
    // Tags stay visible, without the "x".
    await expect(tagLabels(canvas)).toEqual(["Peito", "Tríceps"]);
    await expect(canvas.queryByRole("button", { name: /^Remover/ })).toBeNull();
  },
};

export const WithError: Story = {
  args: { error: "Selecione pelo menos um grupo muscular", value: ["2"] },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("Selecione pelo menos um grupo muscular"),
    ).toBeVisible();
    await expect(tagLabels(canvas)).toEqual(["Costas"]);
  },
};
