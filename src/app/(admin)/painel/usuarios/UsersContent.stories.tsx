import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect, fn, screen, waitFor, within } from "storybook/test";
import { adminDirectoryUsers } from "@/components/domain/adminStoryFixtures";
import { withSeededQueries } from "@/components/domain/storyQuery";
import { UsersContent } from "./UsersContent";

type Mode = "ok" | "pending" | "error";
let mode: Mode = "ok";
const replace = fn();

/** A stand-in for `GET /admin/users`: filters the fixture page, and pages it 2 at a time on "c". */
const usersFetch = fn(async (input: RequestInfo | URL) => {
  const url = new URL(String(input), "http://localhost");
  if (mode === "pending") return new Promise<Response>(() => {});
  if (mode === "error") return Response.json({ error: { code: "UPSTREAM_UNAVAILABLE", message: "x" } }, { status: 503 });
  const role = url.searchParams.get("role");
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q")?.toLowerCase();
  const users = adminDirectoryUsers.filter(
    (user) =>
      (!role || user.role === role) &&
      (!status || user.suspended === (status === "SUSPENDED")) &&
      (!q || user.name.toLowerCase().includes(q) || user.email.includes(q)),
  );
  const cursor = url.searchParams.get("cursor");
  if (cursor === "next") return Response.json({ users: users.slice(0, 2).reverse(), nextCursor: null });
  return Response.json({ users, nextCursor: users.length > 0 ? "next" : null });
});

const meta = {
  component: UsersContent,
  args: { initialFilters: {} },
  parameters: { layout: "fullscreen" },
  decorators: [withSeededQueries({})],
  beforeEach: () => {
    mode = "ok";
    replace.mockClear();
    usersFetch.mockClear();
    useRouter.mockReturnValue({ replace, push: fn(), prefetch: fn(), back: fn(), forward: fn(), refresh: fn() } as unknown as ReturnType<typeof useRouter>);
    const original = window.fetch;
    window.fetch = usersFetch as typeof fetch;
    return () => {
      window.fetch = original;
    };
  },
} satisfies Meta<typeof UsersContent>;

export default meta;
type Story = StoryObj<typeof meta>;

const table = (canvas: ReturnType<typeof within>) => canvas.findByRole("table", { name: "Usuários" });

/** `ETgH1`: badges, "N alunos", the current trainer as a link, "Sem treinador" (E15), paging. */
export const Loaded: Story = {
  play: async ({ canvas }) => {
    const rows = within(await table(canvas));
    await expect(await rows.findByText("Ana Ribeiro", { selector: "span" })).toBeVisible();
    await expect(rows.getByText("12 alunos")).toBeVisible();
    await expect(rows.getByText("1 aluno")).toBeVisible();
    await expect(rows.getAllByRole("link", { name: "Ana Ribeiro" })[0]).toHaveAttribute("href", "/painel/usuarios/1");
    await expect(rows.getAllByText("Sem treinador")).toHaveLength(2);
    await expect(rows.getAllByText("Suspenso")).toHaveLength(2);
    await expect(rows.getByRole("link", { name: "Ver perfil de Marina Costa" })).toHaveAttribute("href", "/painel/usuarios/2");
    await expect(canvas.getByText("1–10")).toBeVisible();
    // No totals and no page numbers (cursor paging, §7.1).
    await expect(canvas.queryByText(/de \d/)).toBeNull();
  },
};

/** Next sends the page's cursor (the stand-in's second page is rows 26–27 at 25 per page) with the same filters; previous goes back to page 1. */
export const Paging: Story = {
  play: async ({ canvas, userEvent }) => {
    await table(canvas);
    await userEvent.click(await canvas.findByRole("button", { name: "Próxima página" }));
    await waitFor(() => expect(canvas.getByText("26–27")).toBeVisible());
    const sent = new URL(String(usersFetch.mock.lastCall![0]), "http://localhost");
    await expect(sent.searchParams.get("cursor")).toBe("next");
    await expect(sent.searchParams.get("limit")).toBe("25");
    await userEvent.click(canvas.getByRole("button", { name: "Página anterior" }));
    await waitFor(() => expect(canvas.getByText("1–10")).toBeVisible());
  },
};

/** A filter goes to the BFF and to the URL, and starts again at page 1. */
export const FilterByRole: Story = {
  play: async ({ canvas, userEvent }) => {
    await table(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Papel" }));
    await userEvent.click(within(await screen.findByRole("listbox")).getByRole("option", { name: "Treinadores" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/painel/usuarios?papel=treinador", { scroll: false }));
    const rows = within(await table(canvas));
    await waitFor(() => expect(rows.queryByText("Marina Costa", { selector: "span" })).toBeNull());
    const sent = new URL(String(usersFetch.mock.lastCall![0]), "http://localhost");
    await expect(sent.searchParams.get("role")).toBe("TRAINER");
    await expect(sent.searchParams.has("cursor")).toBe(false);
  },
};

/** `BVZe4`: a search with no result, and "Limpar filtros". */
export const SearchWithoutResults: Story = {
  args: { initialFilters: { q: "joaquim" } },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText('Nenhum usuário encontrado para "joaquim"')).toBeVisible();
    await expect(canvas.getByText("Confira o nome ou o e-mail, ou limpe os filtros.")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Limpar filtros" }));
    await expect(canvas.getByRole("searchbox", { name: "Buscar" })).toHaveValue("");
    await expect((await canvas.findAllByText("Ana Ribeiro", { selector: "span" }))[0]).toBeInTheDocument();
  },
};

/** The search is debounced and trimmed before it reaches the BFF. */
export const DebouncedSearch: Story = {
  play: async ({ canvas, userEvent }) => {
    await table(canvas);
    usersFetch.mockClear();
    await userEvent.type(canvas.getByRole("searchbox", { name: "Buscar" }), "  rafa ");
    await waitFor(() => expect(usersFetch).toHaveBeenCalledTimes(1));
    const sent = new URL(String(usersFetch.mock.lastCall![0]), "http://localhost");
    await expect(sent.searchParams.get("q")).toBe("rafa");
  },
};

/** `i6hSFx`: skeleton rows under the head row. */
export const Loading: Story = {
  beforeEach: () => {
    mode = "pending";
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Carregando")).toBeInTheDocument();
  },
};

/** The list could not load: a retry. */
export const ErrorState: Story = {
  beforeEach: () => {
    mode = "error";
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Não foi possível carregar os usuários");
    await expect(canvas.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
  },
};

const phone = { viewport: { value: "mobile1", isRotated: false } };

/** `fXng6`: stacked items, each a link to the profile. */
export const Phone: Story = {
  globals: phone,
  play: async ({ canvas }) => {
    const list = within(await canvas.findByRole("list", { name: "Usuários" }));
    await expect(list.getAllByText("Treinador atual: Ana Ribeiro")[0].closest("a")).toHaveAttribute(
      "href",
      "/painel/usuarios/2",
    );
    await expect(list.getAllByText("Sem treinador")).toHaveLength(2);
  },
};
