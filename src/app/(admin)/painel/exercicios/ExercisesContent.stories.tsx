import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect, fn, screen, waitFor, within } from "storybook/test";
import { ToastProvider } from "@/components/ui";
import {
  adminMuscleGroups,
  adminPrivateExercises,
  adminStarterExercises,
} from "@/components/domain/adminStoryFixtures";
import { withSeededQueries } from "@/components/domain/storyQuery";
import { ExercisesContent } from "./ExercisesContent";

type Mode = "ok" | "pending" | "error";
let mode: Mode = "ok";
let deleteAnswer: "ok" | "in-use" = "ok";
/** Starter list in two pages: page 2 ("p2") holds one row until it is deleted. */
let twoPages = false;
let lastRowDeleted = false;
/** Delay the trainers' list, to see what shows while it loads. */
let slowPrivate = false;
const replace = fn();

const json = (body: unknown, status = 200) => Response.json(body, { status });

/** A stand-in for the catalog routes: lists filter the fixtures; deletes answer per `deleteAnswer`. */
const catalogFetch = fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), "http://localhost");
  const method = init?.method ?? "GET";
  if (url.pathname.endsWith("/muscle-groups") && method === "GET") return json(adminMuscleGroups);
  if (method === "DELETE") {
    if (twoPages) lastRowDeleted = true;
    return deleteAnswer === "in-use"
      ? json({ error: { code: "EXERCISE_IN_USE", message: "x" } }, 409)
      : new Response(null, { status: 204 });
  }
  if (mode === "pending") return new Promise<Response>(() => {});
  if (mode === "error") return json({ error: { code: "UPSTREAM_UNAVAILABLE", message: "x" } }, 503);
  const scope = url.searchParams.get("scope");
  if (scope === "PRIVATE" && slowPrivate) return new Promise<Response>(() => {});
  if (twoPages && scope === "STARTER") {
    if (url.searchParams.get("cursor") === "p2") {
      return json({ exercises: lastRowDeleted ? [] : [adminStarterExercises[7]], nextCursor: null });
    }
    return json({ exercises: adminStarterExercises.slice(0, 7), nextCursor: "p2" });
  }
  const group = Number(url.searchParams.get("muscleGroupId")) || null;
  const q = url.searchParams.get("q")?.toLowerCase();
  const exercises = (scope === "PRIVATE" ? adminPrivateExercises : adminStarterExercises).filter(
    (exercise) =>
      (!group || exercise.muscleGroups.some((g) => g.id === group)) && (!q || exercise.name.toLowerCase().includes(q)),
  );
  return json({ exercises, nextCursor: null });
});

const meta = {
  component: ExercisesContent,
  args: { initialView: { tab: "starter" } },
  parameters: { layout: "fullscreen" },
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
    deleteAnswer = "ok";
    twoPages = false;
    lastRowDeleted = false;
    slowPrivate = false;
    replace.mockClear();
    catalogFetch.mockClear();
    useRouter.mockReturnValue({ replace, push: fn(), prefetch: fn(), back: fn(), forward: fn(), refresh: fn() } as unknown as ReturnType<typeof useRouter>);
    const original = window.fetch;
    window.fetch = catalogFetch as typeof fetch;
    return () => {
      window.fetch = original;
    };
  },
} satisfies Meta<typeof ExercisesContent>;

export default meta;
type Story = StoryObj<typeof meta>;

const table = (canvas: ReturnType<typeof within>, name: string) => canvas.findByRole("table", { name });
const lastList = () => {
  const call = catalogFetch.mock.calls.findLast(([input]) => String(input).includes("/admin/exercises?"));
  return new URL(String(call![0]), "http://localhost");
};

/** `c53jx`: starter rows with their groups, edit and delete; no counts (§7.1). */
export const StarterCatalog: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("tab", { name: "Catálogo inicial" })).toHaveAttribute("aria-selected", "true");
    const rows = within(await table(canvas, "Catálogo inicial"));
    await expect(await rows.findByText("Supino reto com barra")).toBeVisible();
    await expect(rows.getAllByText("Tríceps")).toHaveLength(2);
    await expect(rows.getByRole("button", { name: "Editar Supino reto com barra" })).toBeVisible();
    await expect(rows.getByRole("button", { name: "Excluir Supino reto com barra" })).toBeVisible();
    await expect(rows.queryByRole("button", { name: /Promover/ })).toBeNull();
    await expect(canvas.getByRole("button", { name: "Novo exercício" })).toBeVisible();
    await expect(lastList().searchParams.get("scope")).toBe("STARTER");
    await expect(canvas.queryByText(/USADO EM|treinos/i)).toBeNull();
  },
};

/** `iiou2`: the trainers' tab, read-only, with the owner and "Promover ao catálogo" only (R57, E30). */
export const TrainersTab: Story = {
  play: async ({ canvas, userEvent }) => {
    await table(canvas, "Catálogo inicial");
    await userEvent.click(canvas.getByRole("tab", { name: "Exercícios dos treinadores" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/painel/exercicios?aba=treinadores", { scroll: false }));
    const rows = within(await table(canvas, "Exercícios dos treinadores"));
    await expect(await rows.findByText("Elevação pélvica com pausa")).toBeVisible();
    await expect(rows.getByRole("link", { name: "Ana Ribeiro" })).toHaveAttribute("href", "/painel/usuarios/1");
    await expect(rows.getByRole("button", { name: "Promover Elevação pélvica com pausa ao catálogo" })).toBeVisible();
    await expect(rows.queryByRole("button", { name: /Editar|Excluir/ })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Novo exercício" })).toBeNull();
    await expect(canvas.getByText("Exercícios privados criados pelos treinadores")).toBeVisible();
    await expect(lastList().searchParams.get("scope")).toBe("PRIVATE");
  },
};

/** `I6NIe`: promote opens the form prefilled from the trainer's row. */
export const PromoteOpensPrefilledCopy: Story = {
  args: { initialView: { tab: "trainers" } },
  play: async ({ canvas, userEvent }) => {
    const rows = within(await table(canvas, "Exercícios dos treinadores"));
    await userEvent.click(await rows.findByRole("button", { name: "Promover Elevação pélvica com pausa ao catálogo" }));
    const dialog = within(await screen.findByRole("dialog"));
    await expect(dialog.getByRole("heading", { name: "Promover ao catálogo" })).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Nome" })).toHaveValue("Elevação pélvica com pausa");
  },
};

/** The group filter goes to the BFF and to the URL. */
export const FilterByGroup: Story = {
  play: async ({ canvas, userEvent }) => {
    await table(canvas, "Catálogo inicial");
    await userEvent.click(canvas.getByRole("button", { name: "Grupo muscular" }));
    await userEvent.click(within(await screen.findByRole("listbox")).getByRole("option", { name: "Costas" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/painel/exercicios?grupo=2", { scroll: false }));
    await waitFor(() => expect(lastList().searchParams.get("muscleGroupId")).toBe("2"));
    const rows = within(await table(canvas, "Catálogo inicial"));
    await waitFor(() => expect(rows.queryByText("Supino reto com barra")).toBeNull());
    await expect(rows.getByText("Remada curvada com barra")).toBeVisible();
  },
};

/** A search with no result, and "Limpar filtros". */
export const SearchWithoutResults: Story = {
  args: { initialView: { tab: "starter", q: "joaquim" } },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText('Nenhum exercício encontrado para "joaquim"')).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Limpar filtros" }));
    await expect(canvas.getByRole("searchbox", { name: "Buscar" })).toHaveValue("");
    await expect((await canvas.findAllByText("Supino reto com barra"))[0]).toBeInTheDocument();
  },
};

/** Delete asks first, then the row is gone from the list (refetched) with a toast. */
export const Delete: Story = {
  play: async ({ canvas, userEvent }) => {
    const rows = within(await table(canvas, "Catálogo inicial"));
    await userEvent.click(await rows.findByRole("button", { name: "Excluir Prancha abdominal" }));
    const dialog = within(await screen.findByRole("dialog"));
    await expect(dialog.getByRole("heading", { name: "Excluir exercício?" })).toBeVisible();
    await userEvent.click(dialog.getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const deletes = catalogFetch.mock.calls.filter(([, init]) => init?.method === "DELETE");
    await expect(deletes).toHaveLength(1);
    await expect(String(deletes[0][0])).toContain("/admin/exercises/108");
    await expect(await screen.findByText('"Prancha abdominal" foi excluído.')).toBeVisible();
  },
};

/** `LWZZa`: 409 `EXERCISE_IN_USE` closes the confirmation and shows the banner (E28), dismissible. */
export const DeleteInUse: Story = {
  beforeEach: () => {
    deleteAnswer = "in-use";
  },
  play: async ({ canvas, userEvent }) => {
    const rows = within(await table(canvas, "Catálogo inicial"));
    await userEvent.click(await rows.findByRole("button", { name: "Excluir Supino reto com barra" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const banner = await canvas.findByRole("alert");
    await expect(banner).toHaveTextContent("Este exercício está em uso e não pode ser excluído");
    await expect(banner).toHaveTextContent('"Supino reto com barra" é usado em treinos. Você ainda pode editá-lo.');
    await userEvent.click(canvas.getByRole("button", { name: "Fechar aviso" }));
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

/** Deleting the only row of a later page steps back a page instead of showing an empty catalog. */
export const DeleteLastRowOfPage: Story = {
  beforeEach: () => {
    twoPages = true;
  },
  play: async ({ canvas, userEvent }) => {
    await table(canvas, "Catálogo inicial");
    await userEvent.click(await canvas.findByRole("button", { name: "Próxima página" }));
    const rows = within(await table(canvas, "Catálogo inicial"));
    await userEvent.click(await rows.findByRole("button", { name: "Excluir Prancha abdominal" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(canvas.getByText("1–7")).toBeVisible());
    await expect(canvas.queryByText("O catálogo inicial está vazio")).toBeNull();
  },
};

/** Switching tabs never shows one tab's actions on the other's rows: it loads instead. */
export const TabSwitchLoads: Story = {
  beforeEach: () => {
    slowPrivate = true;
  },
  play: async ({ canvas, userEvent }) => {
    await within(await table(canvas, "Catálogo inicial")).findByText("Supino reto com barra");
    await userEvent.click(canvas.getByRole("tab", { name: "Exercícios dos treinadores" }));
    await expect(await canvas.findByLabelText("Carregando")).toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: /Promover Supino/ })).toBeNull();
  },
};

/** "Grupos musculares" opens `D2koD`; "Novo exercício" opens `Ef6Bz`. */
export const OpensDialogs: Story = {
  play: async ({ canvas, userEvent }) => {
    await table(canvas, "Catálogo inicial");
    await userEvent.click(canvas.getByRole("button", { name: "Grupos musculares" }));
    await expect(await screen.findByRole("heading", { name: "Grupos musculares" })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await userEvent.click(canvas.getByRole("button", { name: "Novo exercício" }));
    await expect(await screen.findByRole("heading", { name: "Novo exercício" })).toBeVisible();
  },
};

export const Loading: Story = {
  beforeEach: () => {
    mode = "pending";
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Carregando")).toBeInTheDocument();
  },
};

export const ErrorState: Story = {
  beforeEach: () => {
    mode = "error";
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Não foi possível carregar os exercícios");
    await expect(canvas.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
  },
};

/** Beside the side nav on a 1024 px screen (~712 px of content): names stay readable, the table scrolls. */
export const NarrowDesktop: Story = {
  args: { initialView: { tab: "trainers" } },
  decorators: [
    (Story) => (
      <div style={{ width: 776 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const tableEl = await table(canvas, "Exercícios dos treinadores");
    const name = await within(tableEl).findByText("Elevação pélvica com pausa");
    await expect(name.getBoundingClientRect().width).toBeGreaterThan(100);
    await expect(tableEl.scrollWidth).toBeGreaterThan(tableEl.clientWidth);
  },
};

const phone = { viewport: { value: "mobile1", isRotated: false } };

/** Phone: stacked rows with the trainer and the promote action. */
export const Phone: Story = {
  args: { initialView: { tab: "trainers" } },
  globals: phone,
  play: async ({ canvas }) => {
    const list = within(await canvas.findByRole("list", { name: "Exercícios dos treinadores" }));
    await expect(await list.findByRole("link", { name: "Rafael Torres" })).toHaveAttribute("href", "/painel/usuarios/3");
    await expect(list.getAllByRole("button", { name: /ao catálogo/ })).toHaveLength(3);
  },
};
