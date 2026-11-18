import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect, fn, screen, waitFor, within } from "storybook/test";
import { adminActionAdmins, adminHistory } from "@/components/domain/adminStoryFixtures";
import { withSeededQueries } from "@/components/domain/storyQuery";
import { HistoryContent } from "./HistoryContent";

type Mode = "ok" | "pending" | "error";
let mode: Mode = "ok";
const replace = fn();

/** A stand-in for `GET /admin/actions` (filtered fixture, a second page on "next") and `/admins`. */
const historyFetch = fn(async (input: RequestInfo | URL) => {
  const url = new URL(String(input), "http://localhost");
  if (url.pathname === "/api/bff/admin/actions/admins") return Response.json(adminActionAdmins);
  if (mode === "pending") return new Promise<Response>(() => {});
  if (mode === "error") return Response.json({ error: { code: "UPSTREAM_UNAVAILABLE", message: "x" } }, { status: 503 });
  const adminId = url.searchParams.get("adminId");
  const action = url.searchParams.get("action");
  const target = url.searchParams.get("targetUserId");
  const entries = adminHistory.filter(
    (entry) =>
      (!adminId || entry.admin.id === Number(adminId)) &&
      (!action || entry.action === action) &&
      (!target || entry.targetUser?.id === Number(target)),
  );
  if (url.searchParams.get("cursor") === "next") return Response.json({ entries: entries.slice(0, 1), nextCursor: null });
  return Response.json({ entries, nextCursor: entries.length > 0 ? "next" : null });
});

const meta = {
  component: HistoryContent,
  args: { initialFilters: {} },
  parameters: { layout: "fullscreen" },
  decorators: [withSeededQueries({})],
  beforeEach: () => {
    mode = "ok";
    replace.mockClear();
    historyFetch.mockClear();
    useRouter.mockReturnValue({ replace, push: fn(), prefetch: fn(), back: fn(), forward: fn(), refresh: fn() } as unknown as ReturnType<typeof useRouter>);
    const original = window.fetch;
    window.fetch = historyFetch as typeof fetch;
    return () => {
      window.fetch = original;
    };
  },
} satisfies Meta<typeof HistoryContent>;

export default meta;
type Story = StoryObj<typeof meta>;

const lastActionsUrl = () =>
  historyFetch.mock.calls
    .map(([input]) => new URL(String(input), "http://localhost"))
    .filter((url) => url.pathname === "/api/bff/admin/actions")
    .at(-1)!;

/** `TExWT`: date and time in São Paulo, labels from the map, details per §6. */
export const Loaded: Story = {
  play: async ({ canvas }) => {
    const table = within(await canvas.findByRole("table", { name: "Histórico" }));
    await expect(await table.findByText("17/11/2026 09:31")).toBeVisible();
    await expect(table.getByText("Suspendeu usuário")).toBeVisible();
    await expect(table.getByText("Denúncia de cobrança indevida em análise pelo suporte (ticket #4821).")).toBeVisible();
    await expect(table.getByText('"Elevação pélvica com pausa" copiado para o catálogo inicial.')).toBeVisible();
    await expect(table.getByText("Vínculo com Rafael Torres encerrado.")).toBeVisible();
    await expect(table.getByRole("link", { name: "Rafael Torres" })).toHaveAttribute("href", "/painel/usuarios/3");
    // A deleted account reads as the BFF sends it, with no link (R72).
    await expect(table.getByText("Usuário removido")).toBeVisible();
    await expect(table.queryByRole("link", { name: "Usuário removido" })).toBeNull();
    await expect(table.getByText("Alterou a própria senha")).toBeVisible();
    await expect(canvas.getByText("1–6")).toBeVisible();
  },
};

/** Admin and action filters go to the BFF and the URL, from page 1. */
export const Filters: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("table", { name: "Histórico" });
    await userEvent.click(canvas.getByRole("button", { name: "Ação" }));
    const options = within(await screen.findByRole("listbox")).getAllByRole("option");
    // "Todas as ações" plus the 13 labels.
    await expect(options).toHaveLength(14);
    await userEvent.click(options.find((o) => o.textContent === "Encerrou vínculo")!);
    await waitFor(() => expect(lastActionsUrl().searchParams.get("action")).toBe("END_RELATIONSHIP"));
    await expect(lastActionsUrl().searchParams.has("cursor")).toBe(false);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/painel/historico?acao=END_RELATIONSHIP", { scroll: false }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Admin" }));
    await userEvent.click(within(await screen.findByRole("listbox")).getByRole("option", { name: "João Pires" }));
    await waitFor(() => expect(lastActionsUrl().searchParams.get("adminId")).toBe("10"));
  },
};

/** `?usuario=<id>` from a profile: a removable chip named from the entries. */
export const AffectedUserChip: Story = {
  args: { initialFilters: { targetUserId: 3 } },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText("Rafael Torres", { selector: "span" })).toBeVisible();
    await expect(lastActionsUrl().searchParams.get("targetUserId")).toBe("3");
    await userEvent.click(canvas.getByRole("button", { name: "Remover filtro de usuário afetado" }));
    await waitFor(() => expect(lastActionsUrl().searchParams.has("targetUserId")).toBe(false));
  },
};

/** Paging by cursor, same filters. */
export const Paging: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("table", { name: "Histórico" });
    await userEvent.click(await canvas.findByRole("button", { name: "Próxima página" }));
    await waitFor(() => expect(lastActionsUrl().searchParams.get("cursor")).toBe("next"));
    await expect(await canvas.findByText("26–26")).toBeVisible();
  },
};

/** `ZCKW9`: nothing for the filters, and "Limpar filtros". */
export const NoResults: Story = {
  args: { initialFilters: { adminId: 10, action: "SUSPEND_USER" } },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText("Nenhuma ação encontrada")).toBeVisible();
    await expect(
      await canvas.findByText('Nenhuma ação de João Pires do tipo "Suspendeu usuário". Ajuste ou limpe os filtros.'),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Limpar filtros" }));
    await expect((await canvas.findAllByText("Suspendeu usuário"))[0]).toBeVisible();
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
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Não foi possível carregar o histórico");
  },
};

const phone = { viewport: { value: "mobile1", isRotated: false } };

export const Phone: Story = {
  globals: phone,
  play: async ({ canvas }) => {
    const list = within(await canvas.findByRole("list", { name: "Histórico" }));
    await expect(list.getByText("Suspendeu usuário")).toBeVisible();
    await expect(list.getAllByText("Carla Mendes")[0]).toBeVisible();
  },
};
