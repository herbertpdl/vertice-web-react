import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, screen, waitFor, within } from "storybook/test";
import { ToastProvider } from "@/components/ui";
import { adminMostUsed, adminMuscleGroups } from "../adminStoryFixtures";
import { withSeededQueries } from "../storyQuery";
import { MostUsedExercises } from "./MostUsedExercises";

type Mode = "ok" | "pending" | "error" | "empty";
let mode: Mode = "ok";

const json = (body: unknown, status = 200) => Response.json(body, { status });

/** A stand-in for `GET /admin/exercises/most-used`: filters by group, a second page on "c2". */
const mostUsedFetch = fn(async (input: RequestInfo | URL) => {
  const url = new URL(String(input), "http://localhost");
  if (url.pathname.endsWith("/muscle-groups")) return json(adminMuscleGroups);
  if (mode === "pending") return new Promise<Response>(() => {});
  if (mode === "error") return json({ error: { code: "UPSTREAM_UNAVAILABLE", message: "x" } }, 503);
  if (mode === "empty") return json({ exercises: [], nextCursor: null });
  const group = Number(url.searchParams.get("muscleGroupId")) || null;
  const rows = adminMostUsed.filter((row) => !group || row.exercise.muscleGroups.some((g) => g.id === group));
  if (url.searchParams.get("cursor") === "c2") return json({ exercises: rows.slice(0, 2), nextCursor: null });
  return json({ exercises: rows, nextCursor: group ? null : "c2" });
});

const meta = {
  component: MostUsedExercises,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
    withSeededQueries({}),
  ],
  beforeEach: () => {
    mode = "ok";
    mostUsedFetch.mockClear();
    const original = window.fetch;
    window.fetch = mostUsedFetch as typeof fetch;
    return () => {
      window.fetch = original;
    };
  },
} satisfies Meta<typeof MostUsedExercises>;

export default meta;
type Story = StoryObj<typeof meta>;

const table = (canvas: ReturnType<typeof within>) => canvas.findByRole("table", { name: "Exercícios mais usados" });
const lastCall = () =>
  new URL(
    String(mostUsedFetch.mock.calls.findLast(([input]) => String(input).includes("most-used"))![0]),
    "http://localhost",
  );

/** `QdD67`: rank, groups, count; a trainer's exercise tagged with its trainer and promotable (R26). */
export const Loaded: Story = {
  play: async ({ canvas }) => {
    const rows = within(await table(canvas));
    await expect(await rows.findByText("Supino reto com barra")).toBeVisible();
    await expect(rows.getByText("Peito, Tríceps")).toBeVisible();
    await expect(rows.getByText("412")).toBeVisible();
    await expect(rows.getByText("Privado · Ana Ribeiro")).toBeVisible();
    await expect(rows.getByText("Privado · Rafael Torres")).toBeVisible();
    // Only the two private rows can be promoted.
    await expect(rows.getAllByRole("button", { name: /ao catálogo/ })).toHaveLength(2);
    await expect(rows.getAllByRole("row")[6]).toHaveTextContent(/^6/);
    await expect(lastCall().searchParams.get("limit")).toBe("10");
    await expect(canvas.getByText("1–10")).toBeVisible();
  },
};

/** The next page keeps counting ranks from 11. */
export const Paging: Story = {
  play: async ({ canvas, userEvent }) => {
    await table(canvas);
    await userEvent.click(await canvas.findByRole("button", { name: "Próxima página" }));
    await waitFor(() => expect(canvas.getByText("11–12")).toBeVisible());
    await expect(lastCall().searchParams.get("cursor")).toBe("c2");
    const rows = within(await table(canvas));
    await expect(rows.getAllByRole("row")[1]).toHaveTextContent(/^11/);
  },
};

/** The group filter goes to the BFF and starts again at page 1. */
export const FilterByGroup: Story = {
  play: async ({ canvas, userEvent }) => {
    await table(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Grupo muscular" }));
    await userEvent.click(within(await screen.findByRole("listbox")).getByRole("option", { name: "Glúteos" }));
    await waitFor(() => expect(lastCall().searchParams.get("muscleGroupId")).toBe("8"));
    await expect(lastCall().searchParams.has("cursor")).toBe(false);
    const rows = within(await table(canvas));
    await waitFor(() => expect(rows.queryByText("Supino reto com barra")).toBeNull());
    await expect(rows.getByText("Elevação pélvica com pausa")).toBeVisible();
  },
};

/** "Promover" opens the prefilled copy (`I6NIe`). */
export const Promote: Story = {
  play: async ({ canvas, userEvent }) => {
    const rows = within(await table(canvas));
    await userEvent.click(await rows.findByRole("button", { name: "Promover Elevação pélvica com pausa ao catálogo" }));
    const dialog = within(await screen.findByRole("dialog"));
    await expect(dialog.getByRole("heading", { name: "Promover ao catálogo" })).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Nome" })).toHaveValue("Elevação pélvica com pausa");
  },
};

/**
 * The content width beside the side nav on a 1024 px screen (~712 px): the name keeps its room and
 * the table scrolls sideways rather than clipping "Promover".
 */
export const NarrowDesktop: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 712 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const tableEl = await table(canvas);
    const name = await within(tableEl).findByText("Supino reto com barra");
    await expect(name.getBoundingClientRect().width).toBeGreaterThan(100);
    await expect(tableEl.scrollWidth).toBeGreaterThan(tableEl.clientWidth);
    const promote = within(tableEl).getByRole("button", { name: "Promover Elevação pélvica com pausa ao catálogo" });
    promote.scrollIntoView();
    await waitFor(() => expect(promote.getBoundingClientRect().right).toBeLessThanOrEqual(tableEl.getBoundingClientRect().right + 1));
  },
};

/** `rNMsp`: skeleton rows under the head. */
export const Loading: Story = {
  beforeEach: () => {
    mode = "pending";
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Carregando")).toBeInTheDocument();
    await expect(canvas.getByRole("heading", { name: "Exercícios mais usados" })).toBeVisible();
  },
};

export const Empty: Story = {
  beforeEach: () => {
    mode = "empty";
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Nenhum exercício está em treinos ainda")).toBeVisible();
  },
};

export const ErrorState: Story = {
  beforeEach: () => {
    mode = "error";
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os exercícios mais usados",
    );
    await expect(canvas.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
  },
};

const phone = { viewport: { value: "mobile1", isRotated: false } };

/** `qzCk9`: stacked items with "groups · N treinos", the tag and a plain "Promover". */
export const Phone: Story = {
  globals: phone,
  play: async ({ canvas }) => {
    const list = within(await canvas.findByRole("list", { name: "Exercícios mais usados" }));
    await expect(await list.findByText("Peito, Tríceps · 412 treinos")).toBeVisible();
    await expect(list.getByText("Privado · Ana Ribeiro")).toBeVisible();
    await expect(list.getByRole("button", { name: "Promover Elevação pélvica com pausa ao catálogo" })).toHaveTextContent(
      "Promover",
    );
  },
};
