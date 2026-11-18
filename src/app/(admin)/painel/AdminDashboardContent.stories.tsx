import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { adminDashboard } from "@/components/domain/adminStoryFixtures";
import { withSeededQueries } from "@/components/domain/storyQuery";
import { AdminDashboardContent } from "./AdminDashboardContent";

const key = JSON.stringify(["admin", "dashboard"]);

const meta = {
  component: AdminDashboardContent,
  parameters: { layout: "fullscreen" },
  decorators: [withSeededQueries({ [key]: adminDashboard })],
} satisfies Meta<typeof AdminDashboardContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** `En3Ju`: the four cards, the chart, and when the data was read. No deltas (§7.1). */
export const Loaded: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(canvas.getByText(/atualizado às \d{2}:\d{2}/)).toBeVisible();
    await expect(canvas.getAllByText("128")[0]).toBeVisible();
    await expect(canvas.getAllByText("1.942")[0]).toBeVisible();
    // Active users: the sum and the split, over 7 and 30 days.
    await expect(canvas.getAllByText("1.208")[0]).toBeVisible();
    await expect(canvas.getByText("1.114 alunos")).toBeVisible();
    await expect(canvas.getAllByText("1.671")[0]).toBeVisible();
    await expect(canvas.getAllByText("14.106")[0]).toBeVisible();
    await expect(canvas.getByRole("img", { name: /Novos cadastros nas últimas 12 semanas/ })).toBeVisible();
    await expect(canvas.queryByText(/nos últimos 7 dias/)).toBeNull();
  },
};

/** `rNMsp`: card and chart skeletons while the dashboard loads. */
export const Loading: Story = {
  decorators: [withSeededQueries({}, { pending: [key] })],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(canvas.queryByText("128")).toBeNull();
    await expect(canvas.queryByText(/atualizado às/)).toBeNull();
  },
};

/** The dashboard could not load: a retry, no figures. */
export const ErrorState: Story = {
  decorators: [withSeededQueries({}, { failing: [key] })],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("Não foi possível carregar o dashboard");
    await expect(canvas.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
  },
};

const phone = { viewport: { value: "mobile1", isRotated: false } };

/** `qzCk9`: six small cards in two columns, then the compact chart. */
export const Phone: Story = {
  globals: phone,
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Ativos · 7 dias")).toBeVisible();
    await expect(canvas.getByText("94 treinadores · 1.114 alunos")).toBeVisible();
    await expect(canvas.getByText(/Atualizado às/)).toBeVisible();
  },
};
