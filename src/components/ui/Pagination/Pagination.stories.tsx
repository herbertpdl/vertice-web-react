import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, screen, within } from "storybook/test";
import { Pagination } from "./Pagination";

const meta = {
  component: Pagination,
  args: {
    pageSize: 10,
    pageSizes: [10, 25, 50],
    onPageSizeChange: fn(),
    range: { from: 11, to: 20 },
    hasPrev: true,
    hasNext: true,
    onPrev: fn(),
    onNext: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-[1100px] border-t border-[var(--color-border)] bg-[var(--color-surface)] px-[20px] py-[12px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Page 1: nothing before it. */
export const FirstPage: Story = {
  args: { range: { from: 1, to: 10 }, hasPrev: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("1–10")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Página anterior" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Próxima página" })).toBeEnabled();
  },
};

/** A middle page: both arrows work. No page numbers or totals (cursor paging). */
export const Middle: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByText("11–20")).toBeVisible();
    await expect(canvas.queryByText(/de \d/)).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Próxima página" }));
    await expect(args.onNext).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole("button", { name: "Página anterior" }));
    await expect(args.onPrev).toHaveBeenCalledOnce();
  },
};

/** The last page: a short one, nothing after it. */
export const LastPage: Story = {
  args: { range: { from: 2061, to: 2070 }, hasNext: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("2.061–2.070")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Próxima página" })).toBeDisabled();
  },
};

/** While a page loads both arrows wait. */
export const Busy: Story = {
  args: { busy: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Página anterior" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Próxima página" })).toBeDisabled();
  },
};

/** "Linhas por página" open: 10, 25 and 50. */
export const PageSizeOpen: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const select = canvas.getByRole("button", { name: "Linhas por página 10" });
    await userEvent.click(select);
    const listbox = await screen.findByRole("listbox");
    await expect(within(listbox).getAllByRole("option").map((o) => o.textContent)).toEqual(["10", "25", "50"]);
    await userEvent.click(within(listbox).getByRole("option", { name: "25" }));
    await expect(args.onPageSizeChange).toHaveBeenCalledWith(25);
  },
};

const phone = { viewport: { value: "mobile1", isRotated: false } };

/** On a phone: only the range and the arrows (`fXng6`). */
export const Phone: Story = {
  globals: phone,
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Linhas por página")).not.toBeVisible();
    await expect(canvas.getByText("11–20")).toBeVisible();
  },
};
