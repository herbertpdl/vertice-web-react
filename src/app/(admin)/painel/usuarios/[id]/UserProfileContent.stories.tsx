import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect, fn, waitFor, within } from "storybook/test";
import { adminClientProfile, adminTrainerProfile } from "@/components/domain/adminStoryFixtures";
import { withSeededQueries } from "@/components/domain/storyQuery";
import type { AdminUserProfile } from "@/lib/api/types";
import { UserProfileContent } from "./UserProfileContent";

type Answer = AdminUserProfile | "pending" | 404 | 503;
let answer: Answer = adminClientProfile;
const replace = fn();

const suspensionEntry = {
  id: 77,
  admin: { id: 9, name: "Carla Mendes", role: "ADMIN" },
  action: "SUSPEND_USER",
  targetUser: { id: 1, name: "Ana Ribeiro", role: "TRAINER" },
  relatedUser: null,
  targetExerciseId: null,
  targetMuscleGroupId: null,
  subjectLabel: null,
  reason: "denúncia de cobrança indevida em análise",
  createdAt: "2026-11-12T14:00:00Z",
};

/** A stand-in for the BFF: the profile, and the suspension history entry. */
const bffFetch = fn(async (input: RequestInfo | URL) => {
  const url = new URL(String(input), "http://localhost");
  if (url.pathname === "/api/bff/admin/actions") {
    return Response.json({ entries: [suspensionEntry], nextCursor: null });
  }
  if (answer === "pending") return new Promise<Response>(() => {});
  if (answer === 404) return Response.json({ error: { code: "NOT_FOUND", message: "x" } }, { status: 404 });
  if (answer === 503) return Response.json({ error: { code: "UPSTREAM_UNAVAILABLE", message: "x" } }, { status: 503 });
  return Response.json(answer);
});

const profileCalls = () =>
  bffFetch.mock.calls.filter(([input]) => String(input).startsWith("/api/bff/admin/users/")).length;

const meta = {
  component: UserProfileContent,
  args: { userId: 2 },
  parameters: { layout: "fullscreen" },
  decorators: [withSeededQueries({})],
  beforeEach: () => {
    answer = adminClientProfile;
    replace.mockClear();
    bffFetch.mockClear();
    useRouter.mockReturnValue({ replace, push: fn(), prefetch: fn(), back: fn(), forward: fn(), refresh: fn() } as unknown as ReturnType<typeof useRouter>);
    const original = window.fetch;
    window.fetch = bffFetch as typeof fetch;
    return () => {
      window.fetch = original;
    };
  },
} satisfies Meta<typeof UserProfileContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * `M3SiW`: read-only data with the CPF masked as sent, current and past trainers as links (R37),
 * the counts. No edit controls, and no logs, weights or feedback.
 */
export const Client: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { level: 1, name: "Marina Costa" })).toBeVisible();
    await expect(canvas.getByText("Somente leitura")).toBeVisible();
    await expect(canvas.getByText("***.***.***-01")).toBeVisible();
    await expect(canvas.getByText("14/03/2026")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Ana Ribeiro" })).toHaveAttribute("href", "/painel/usuarios/1");
    await expect(canvas.getByText("Desde 02/06/2026")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Rafael Torres" })).toHaveAttribute("href", "/painel/usuarios/3");
    await expect(canvas.getByText("10/01/2026 – 01/06/2026")).toBeVisible();
    await expect(canvas.getByText("148")).toBeVisible();
    // Read only: no inputs and no action buttons; the frame's "Telefone" is left out (§7.1).
    await expect(canvas.queryByRole("textbox")).toBeNull();
    await expect(canvas.getByRole("link", { name: "Histórico" })).toHaveAttribute("href", "/painel/historico?usuario=2");
    await expect(canvas.queryAllByRole("button")).toHaveLength(0);
    await expect(canvas.queryByText("Telefone")).toBeNull();
  },
};

/** One `GET /admin/users/:id` per visit: focus and reconnect never refetch (each call writes history). */
export const FetchedOncePerVisit: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole("heading", { level: 1, name: "Marina Costa" });
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("online"));
    await new Promise((resolve) => setTimeout(resolve, 300));
    await expect(profileCalls()).toBe(1);
  },
};

/** `eUOyS`: CREF, the shared contacts, 4 of 12 current clients until "Ver todos", former clients. */
export const Trainer: Story = {
  args: { userId: 1 },
  beforeEach: () => {
    answer = adminTrainerProfile;
  },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByRole("heading", { level: 1, name: "Ana Ribeiro" })).toBeVisible();
    await expect(canvas.getByText("012345-G/SP")).toBeVisible();
    await expect(canvas.getByText("@ana.treina")).toBeVisible();
    const current = within(canvas.getByRole("heading", { name: "Alunos atuais (12)" }).closest("section")!);
    await expect(current.getAllByRole("link")).toHaveLength(4);
    await userEvent.click(current.getByRole("button", { name: "Ver todos os 12 alunos" }));
    await expect(current.getAllByRole("link")).toHaveLength(12);
    await expect(canvas.getByRole("heading", { name: "Alunos anteriores (3)" })).toBeVisible();
    await expect(canvas.getByText("Exercícios privados")).toBeVisible();
    await expect(profileCalls()).toBe(1);
  },
};

/** Contacts the trainer doesn't share are left out, and no CREF or CPF reads "—". */
export const TrainerWithoutSharedContacts: Story = {
  args: { userId: 1 },
  beforeEach: () => {
    answer = { ...adminTrainerProfile, whatsapp: null, instagram: null, cref: null, cpf: null, currentClients: [] };
  },
  play: async ({ canvas }) => {
    await canvas.findByRole("heading", { level: 1, name: "Ana Ribeiro" });
    await expect(canvas.queryByText(/WhatsApp/)).toBeNull();
    await expect(canvas.queryByText(/Instagram/)).toBeNull();
    await expect(canvas.getAllByText("—")).toHaveLength(2);
    await expect(canvas.getByText("Nenhum aluno no momento.")).toBeVisible();
  },
};

/** `d4tAve`: the suspended banner, from the newest SUSPEND_USER entry. */
export const SuspendedTrainer: Story = {
  args: { userId: 1 },
  beforeEach: () => {
    answer = { ...adminTrainerProfile, suspended: true, suspendedAt: "2026-11-12T14:00:00Z" };
  },
  play: async ({ canvas }) => {
    await canvas.findByRole("heading", { level: 1, name: "Ana Ribeiro" });
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent(
        "Suspenso em 12/11/2026 por Carla Mendes. Motivo: denúncia de cobrança indevida em análise. O treinador não consegue entrar enquanto estiver suspenso.",
      ),
    );
    const sent = bffFetch.mock.calls
      .map(([input]) => new URL(String(input), "http://localhost"))
      .find((url) => url.pathname === "/api/bff/admin/actions")!;
    await expect(Object.fromEntries(sent.searchParams)).toEqual({
      targetUserId: "1",
      action: "SUSPEND_USER",
      limit: "10",
    });
  },
};

/** An active account asks nothing of the history. */
export const ActiveAsksNoHistory: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole("heading", { level: 1, name: "Marina Costa" });
    await expect(canvas.queryByRole("status")).toBeNull();
    await expect(bffFetch.mock.calls.some(([input]) => String(input).includes("/admin/actions"))).toBe(false);
  },
};

export const Loading: Story = {
  beforeEach: () => {
    answer = "pending";
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Carregando perfil")).toBeInTheDocument();
  },
};

/** A missing or deleted user (or an admin) is a 404: back to the directory. */
export const NotFound: Story = {
  beforeEach: () => {
    answer = 404;
  },
  play: async () => {
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/painel/usuarios"));
    await expect(profileCalls()).toBe(1);
  },
};

/** Any other failure: no silent retry; "Tentar novamente" fetches (and records) once more. */
export const ErrorState: Story = {
  beforeEach: () => {
    answer = 503;
  },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Não foi possível carregar o perfil");
    await expect(profileCalls()).toBe(1);
    answer = adminClientProfile;
    await userEvent.click(canvas.getByRole("button", { name: "Tentar novamente" }));
    await expect(await canvas.findByRole("heading", { level: 1, name: "Marina Costa" })).toBeVisible();
    await expect(profileCalls()).toBe(2);
  },
};
