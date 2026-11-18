import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { CodeInput } from "./CodeInput";

function Controlled(props: { initial?: string; error?: string; disabled?: boolean }) {
  const [value, setValue] = useState(props.initial ?? "");
  return (
    <div className="w-[400px]">
      <CodeInput id="code" value={value} onChange={setValue} error={props.error} disabled={props.disabled} />
    </div>
  );
}

const meta = {
  component: Controlled,
} satisfies Meta<typeof Controlled>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Partial: Story = { args: { initial: "48" } };

export const Full: Story = { args: { initial: "482190" } };

export const WithError: Story = {
  args: { initial: "482190", error: "Código inválido" },
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText("Código de 6 dígitos");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getByText("Código inválido")).toBeVisible();
  },
};

export const Disabled: Story = { args: { initial: "4821", disabled: true } };

/** Typing and pasting keep digits only, six at most, and fill the cells. */
export const TypesDigitsOnly: Story = {
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText("Código de 6 dígitos");
    await expect(input).toHaveAttribute("autocomplete", "one-time-code");
    await expect(input).toHaveAttribute("inputmode", "numeric");
    await userEvent.click(input);
    await userEvent.paste("123 456");
    await expect(input).toHaveValue("123456");
    await userEvent.clear(input);
    await userEvent.paste("12 a3-456789");
    await expect(input).toHaveValue("123456");
    await expect(canvas.getAllByText("6")[0]).toBeVisible();
  },
};
