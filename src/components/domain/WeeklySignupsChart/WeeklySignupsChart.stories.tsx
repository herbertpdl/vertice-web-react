import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { adminWeeklySignups } from "../adminStoryFixtures";
import { WeeklySignupsChart } from "./WeeklySignupsChart";

const meta = {
  component: WeeklySignupsChart,
  args: { weeks: adminWeeklySignups },
  decorators: [
    (Story) => (
      <div className="max-w-[1160px] p-[16px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WeeklySignupsChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The frame's 12 weeks: the axis rounds 52 up to 60 (0 / 20 / 40 / 60). */
export const TwelveWeeks: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Novos treinadores e alunos por semana" })).toBeVisible();
    const chart = canvas.getByRole("img");
    await expect(chart).toHaveAccessibleName(
      "Novos cadastros nas últimas 12 semanas: 74 treinadores e 439 alunos.",
    );
    await expect(canvas.getByText("60")).toBeVisible();
    await expect(canvas.getAllByText("25/08")[0]).toBeVisible();
    await expect(canvas.getAllByText("10/11")[0]).toBeVisible();
    // The 24 values, for screen readers.
    await expect(canvas.getByRole("table", { name: "Novos cadastros por semana" })).toBeInTheDocument();
  },
};

/** No sign-ups at all: the axis keeps a 0–3 scale and no bar is drawn. */
export const AllZeros: Story = {
  args: { weeks: adminWeeklySignups.map((week) => ({ ...week, trainers: 0, clients: 0 })) },
  play: async ({ canvasElement, canvas }) => {
    await expect(canvas.getByText("3")).toBeVisible();
    await expect(canvasElement.querySelectorAll("path")).toHaveLength(0);
  },
};

/** One week far above the others: it sets the axis, and a single sign-up still shows. */
export const OneDominantWeek: Story = {
  args: {
    weeks: adminWeeklySignups.map((week, i) =>
      i === 10 ? { ...week, trainers: 40, clients: 930 } : { ...week, trainers: i % 2, clients: 1 },
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("1.000")).toBeVisible();
  },
};

export const Loading: Story = {
  args: { weeks: undefined, loading: true },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("img")).toBeNull();
  },
};

const phone = { viewport: { value: "mobile1", isRotated: false } };

/** On a phone: bars only, with the first and last week under them (`qzCk9`). */
export const Phone: Story = {
  globals: phone,
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Últimas 12 semanas")).not.toBeVisible();
  },
};
