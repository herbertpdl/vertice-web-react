import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import { PlanDialog } from "./PlanDialog";
import type { TrainingPlan } from "@/lib/api/types";
import { withSeededQueries } from "../storyQuery";

/**
 * Pinned, so the date rules — "not before today", "not ending the day it starts" — are asserted
 * against a fixed calendar rather than whenever CI happens to run.
 */
const TODAY = "2026-10-19";

const existingPlan: TrainingPlan = {
  id: 7,
  clientId: 3,
  name: "Hipertrofia — Fase 1",
  description: "",
  startDate: "2026-10-12",
  endDate: "2026-11-19",
  level: "INTERMEDIATE",
  trainerId: 1,
};

const meta = {
  component: PlanDialog,
  args: {
    clientId: 3,
    today: TODAY,
    onClose: fn(),
    api: {
      create: fn(async (input) => ({ ...existingPlan, ...input, id: 9 }) as TrainingPlan),
      update: fn(async (id, input) => ({ ...existingPlan, ...input, id }) as TrainingPlan),
    },
  },
  decorators: [withSeededQueries({})],
} satisfies Meta<typeof PlanDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// `Dialog` renders in place but `DateField`'s calendar portals to <body>, so query both from it.
const body = () => within(document.body);
const dateField = (label: string) => body().getByRole("combobox", { name: label });
const calendar = () => body().queryByRole("dialog", { name: "Calendário" });
const day = (name: string) => body().getByRole("gridcell", { name });

export const New: Story = {};

export const Editing: Story = { args: { plan: existingPlan } };

/** A new plan can't start before today: the calendar refuses to offer any earlier day. */
export const StartCannotBeInThePast: Story = {
  play: async ({ userEvent }) => {
    await userEvent.click(dateField("Início"));
    await expect(calendar()).toBeVisible();
    await expect(day("18 de out de 2026")).toBeDisabled();
    await expect(day("19 de out de 2026")).toBeEnabled();
  },
};

/** …and once a start is picked, the end calendar starts the day after it, never on it. */
export const EndCannotBeTheStartDay: Story = {
  play: async ({ userEvent }) => {
    await userEvent.click(dateField("Início"));
    await userEvent.click(day("19 de out de 2026"));
    await expect(dateField("Início")).toHaveValue("19/10/2026");

    await userEvent.click(dateField("Término"));
    await expect(day("19 de out de 2026")).toBeDisabled();
    await expect(day("20 de out de 2026")).toBeEnabled();
  },
};

/** Typing past the calendar's bounds still reaches the schema, which names the actual rule. */
export const SameDayTypedIsRefused: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.type(body().getByLabelText("Nome do plano"), "Plano de um dia");
    await userEvent.type(dateField("Início"), "19102026");
    await userEvent.type(dateField("Término"), "19102026");
    await userEvent.click(body().getByRole("button", { name: "Criar plano" }));

    await expect(
      await body().findByText("O plano precisa terminar depois do dia em que começa"),
    ).toBeVisible();
    await expect(args.api!.create).not.toHaveBeenCalled();
    // The message clears as soon as the date is fixed, rather than sitting there.
    await userEvent.clear(dateField("Término"));
    await userEvent.type(dateField("Término"), "30112026");
    await waitFor(() =>
      expect(
        canvas.queryByText("O plano precisa terminar depois do dia em que começa"),
      ).toBeNull(),
    );
  },
};

/**
 * The reason the floor is not a flat "today": this plan started a week ago, and renaming it must
 * not demand moving its dates first.
 */
export const EditingAStartedPlanSavesUntouched: Story = {
  args: { plan: existingPlan },
  play: async ({ userEvent, args }) => {
    await expect(dateField("Início")).toHaveValue("12/10/2026");
    const name = body().getByLabelText("Nome do plano");
    await userEvent.clear(name);
    await userEvent.type(name, "Hipertrofia — Fase 2");
    await userEvent.click(body().getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(args.api!.update).toHaveBeenCalled());
    await expect(args.api!.update).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ startDate: "2026-10-12", endDate: "2026-11-19" }),
    );
  },
};

/** Escape over an open calendar closes the calendar, not the dialog and the form with it. */
export const EscapeOverTheCalendarKeepsTheDialog: Story = {
  play: async ({ userEvent, args }) => {
    await userEvent.click(dateField("Início"));
    await expect(calendar()).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect(calendar()).toBeNull();
    await expect(args.onClose).not.toHaveBeenCalled();
    await expect(body().getByRole("dialog", { name: /Novo plano/ })).toBeVisible();
  },
};
