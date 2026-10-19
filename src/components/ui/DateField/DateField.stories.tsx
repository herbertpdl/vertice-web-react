import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import { DateField } from "./DateField";

/**
 * `value`/`onChange` are controlled, so every story holds the business date in local state —
 * the same shape `PlanDialog` wires to react-hook-form's `setValue`.
 */
function ControlledDateField({
  value: initialValue = "",
  onChange,
  ...props
}: Partial<React.ComponentProps<typeof DateField>>) {
  const [value, setValue] = useState(initialValue);
  return (
    <DateField
      label="Início"
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

const meta = {
  component: ControlledDateField,
  // Pinned, so "today" is the day the grid rings rather than whenever CI happens to run.
  args: { today: "2026-10-19", onChange: fn() },
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

// The popover is portaled to <body>, so it is never inside the story's own canvas root.
const body = () => within(document.body);
const field = (canvas: ReturnType<typeof within>) => canvas.getByRole("combobox");
const calendar = () => body().queryByRole("dialog", { name: "Calendário" });

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
    await userEvent.click(field(canvas));
    await expect(calendar()).toBeVisible();
  },
};

/**
 * The original bug report was that only the glyph opened the native picker. The glyph is not
 * focusable, so a click on it moves focus to <body> unless the field's mousedown is prevented —
 * which closed the popover in the same gesture that opened it, leaving the click looking dead.
 */
export const OpensFromTheCalendarIcon: Story = {
  args: { value: "2026-10-31" },
  play: async ({ canvasElement, canvas, userEvent }) => {
    const icon = canvasElement.querySelector("svg")!;
    await userEvent.click(icon);
    await expect(calendar()).toBeVisible();
    await expect(field(canvas)).toHaveFocus();
  },
};

/** Arrow-opening must land focus *in* the grid, or none of the grid's key handlers can fire. */
export const PicksADayWithTheKeyboard: Story = {
  args: { value: "2026-10-31" },
  play: async ({ canvas, userEvent }) => {
    const input = field(canvas);
    input.focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(calendar()).toBeVisible();
    await expect(body().getByRole("gridcell", { name: "31 de out de 2026" })).toHaveFocus();

    await userEvent.keyboard("{ArrowLeft}");
    await expect(body().getByRole("gridcell", { name: "30 de out de 2026" })).toHaveFocus();

    await userEvent.keyboard("{PageDown}");
    await expect(body().getByRole("gridcell", { name: "01 de nov de 2026" })).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    await expect(calendar()).toBeNull();
    await expect(input).toHaveValue("01/11/2026");
  },
};

/**
 * Escape must be claimed with `preventDefault()` even when focus is not inside the component,
 * or the `Dialog` wrapping the field closes instead and the whole form is discarded.
 */
export const EscapeClosesOnlyTheCalendar: Story = {
  args: { value: "2026-10-31" },
  play: async ({ canvas, userEvent }) => {
    const seen: boolean[] = [];
    const spy = (event: KeyboardEvent) => {
      if (event.key === "Escape") seen.push(event.defaultPrevented);
    };
    document.addEventListener("keydown", spy);
    try {
      await userEvent.click(field(canvas));
      await expect(calendar()).toBeVisible();
      await userEvent.keyboard("{Escape}");
      await expect(calendar()).toBeNull();
      // What `Dialog`'s own document listener would see: already handled, so it stays open.
      await expect(seen).toEqual([true]);
    } finally {
      document.removeEventListener("keydown", spy);
    }
  },
};

/** Fixing one digit of a filled date must not reflow the segments after it. */
export const EditingOneDigitKeepsTheRest: Story = {
  args: { value: "2026-10-31" },
  play: async ({ canvas, userEvent }) => {
    const input = field(canvas) as HTMLInputElement;
    input.focus();
    input.setSelectionRange(2, 2);
    await userEvent.keyboard("{Backspace}");
    await expect(input).toHaveValue("3/10/2026");

    await userEvent.keyboard("0");
    await expect(input).toHaveValue("30/10/2026");
  },
};

/**
 * Deleting the separator is the case where the mask genuinely rewrites the string: the browser
 * hands over `3110/2026` and the mask puts `31/10/2026` back. Without the caret effect that
 * programmatic write parks the caret at the end of the field.
 */
export const RemaskingKeepsTheCaretPut: Story = {
  args: { value: "2026-10-31" },
  play: async ({ canvas, userEvent }) => {
    const input = field(canvas) as HTMLInputElement;
    input.focus();
    input.setSelectionRange(3, 3);
    await userEvent.keyboard("{Backspace}");
    await expect(input).toHaveValue("31/10/2026");
    await expect(input.selectionStart).toBe(2);
  },
};

/**
 * A half-finished edit must not destroy the date underneath it: only an empty box commits `""`.
 * Asserted on the *committed* value, since the draft in the box hides what the parent holds.
 */
export const AHalfTypedDateKeepsTheCommittedOne: Story = {
  args: { value: "2026-10-31" },
  play: async ({ canvas, userEvent, args }) => {
    const input = field(canvas) as HTMLInputElement;
    input.focus();
    input.setSelectionRange(0, input.value.length);
    await userEvent.keyboard("3");
    await expect(input).toHaveValue("3");
    // "3" is not a date, so nothing was committed over the one already there...
    await expect(args.onChange).not.toHaveBeenCalled();

    // ...and leaving the field brings it back into view.
    await userEvent.tab();
    await expect(input).toHaveValue("31/10/2026");
  },
};

/** Emptying the box, on the other hand, is a real intent to clear and is committed as such. */
export const ClearingTheFieldCommitsEmpty: Story = {
  args: { value: "2026-10-31" },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.clear(field(canvas));
    await expect(args.onChange).toHaveBeenCalledWith("");
    await userEvent.tab();
    await expect(field(canvas)).toHaveValue("");
  },
};

/** At a bound there is no previous month to page to, so the arrow says so instead of no-opping. */
export const MonthArrowStopsAtTheBound: Story = {
  args: { label: "Término", value: "2026-11-20", min: "2026-11-10", max: "2026-12-31" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(field(canvas));
    await expect(body().getByRole("button", { name: "Mês anterior" })).toBeDisabled();

    const next = body().getByRole("button", { name: "Próximo mês" });
    await expect(next).toBeEnabled();
    await userEvent.click(next);
    await expect(body().getByText("dezembro de 2026")).toBeVisible();
    await expect(body().getByRole("button", { name: "Próximo mês" })).toBeDisabled();
  },
};
