import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect, fn, waitFor, within } from "storybook/test";
import { adminClientProfile, adminTrainerProfile } from "@/components/domain/adminStoryFixtures";
import { withSeededQueries } from "@/components/domain/storyQuery";
import { ToastProvider } from "@/components/ui";
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

/** What the account writes (suspend, e-mails, end relationship) answer: a status and headers. */
let writeAnswer: { status: number; code?: string; headers?: Record<string, string> } = { status: 204 };

/** A stand-in for the BFF: the profile, the suspension history entry, and the account writes. */
const bffFetch = fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), "http://localhost");
  if (init?.method && init.method !== "GET") {
    const { status, code, headers } = writeAnswer;
    if (code) return Response.json({ error: { code, message: "x" } }, { status, headers });
    return status === 204 ? new Response(null, { status }) : Response.json({ user: { id: 2 } }, { status });
  }
  if (url.pathname === "/api/bff/admin/actions") {
    return Response.json({ entries: [suspensionEntry], nextCursor: null });
  }
  if (answer === "pending") return new Promise<Response>(() => {});
  if (answer === 404) return Response.json({ error: { code: "NOT_FOUND", message: "x" } }, { status: 404 });
  if (answer === 503) return Response.json({ error: { code: "UPSTREAM_UNAVAILABLE", message: "x" } }, { status: 503 });
  return Response.json(answer);
});

const profileCalls = () =>
  bffFetch.mock.calls.filter(
    ([input, init]) => String(input).startsWith("/api/bff/admin/users/") && (init?.method ?? "GET") === "GET",
  ).length;

const writes = () =>
  bffFetch.mock.calls
    .filter(([, init]) => init?.method && init.method !== "GET")
    .map(([input, init]) => `${init!.method} ${String(input)}`);

const meta = {
  component: UserProfileContent,
  args: { userId: 2 },
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
    answer = adminClientProfile;
    writeAnswer = { status: 204 };
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
    // Read only: no inputs, only the account actions (`fp164`); the frame's "Telefone" is left out (§7.1).
    await expect(canvas.queryByRole("textbox")).toBeNull();
    await expect(canvas.getByRole("link", { name: "Histórico" })).toHaveAttribute("href", "/painel/historico?usuario=2");
    await expect(canvas.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Encerrar vínculo com treinador",
      "Suspender",
      "Enviar e-mail de primeiro acesso",
      "Enviar e-mail de redefinição de senha",
    ]);
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
      // Inside `main`: the toast region is a `status` too.
      expect(within(canvas.getByRole("main")).getByRole("status")).toHaveTextContent(
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
    await expect(within(canvas.getByRole("main")).queryByRole("status")).toBeNull();
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

/** `d4tAve`: a suspended trainer gets "Reativar", and no first-access e-mail (clients only). */
export const SuspendedTrainerActions: Story = {
  args: { userId: 1 },
  beforeEach: () => {
    answer = { ...adminTrainerProfile, suspended: true, suspendedAt: "2026-11-12T14:00:00Z" };
  },
  play: async ({ canvas }) => {
    await canvas.findByRole("heading", { level: 1, name: "Ana Ribeiro" });
    const actions = within(canvas.getByRole("heading", { name: "Ações" }).closest("section")!);
    await expect(actions.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Reativar",
      "Enviar e-mail de redefinição de senha",
    ]);
    await expect(canvas.queryByRole("button", { name: /Encerrar vínculo/ })).toBeNull();
  },
};

/** `fp164`: an e-mail goes on the click (no confirm), once, with a toast naming the address (R49). */
export const EmailSent: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("heading", { level: 1, name: "Marina Costa" });
    await userEvent.dblClick(canvas.getByRole("button", { name: "Enviar e-mail de primeiro acesso" }));
    await expect(
      await within(document.body).findByText("E-mail de primeiro acesso enviado para marina.costa@email.com."),
    ).toBeVisible();
    await expect(writes()).toEqual(["POST /api/bff/admin/users/2/first-access-email"]);
    await expect(profileCalls()).toBe(1);
  },
};

/** 409 on an e-mail route: sending is switched off (production, until SES is live). */
export const EmailsSwitchedOff: Story = {
  beforeEach: () => {
    writeAnswer = { status: 409, code: "PRECONDITION_FAILED" };
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("heading", { level: 1, name: "Marina Costa" });
    await userEvent.click(canvas.getByRole("button", { name: "Enviar e-mail de redefinição de senha" }));
    await expect(
      await within(document.body).findByText("O envio de e-mails está indisponível no momento."),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Enviar e-mail de redefinição de senha" })).toBeEnabled();
  },
};

/** `bHWbL`: a 503 on an e-mail route. */
export const EmailUnavailable: Story = {
  beforeEach: () => {
    writeAnswer = { status: 503, code: "UPSTREAM_UNAVAILABLE" };
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("heading", { level: 1, name: "Marina Costa" });
    await userEvent.click(canvas.getByRole("button", { name: "Enviar e-mail de redefinição de senha" }));
    await expect(
      await within(document.body).findByText("Não foi possível enviar o e-mail. Tente novamente."),
    ).toBeVisible();
  },
};

/** 429 + Retry-After on an e-mail route: how long to wait. */
export const EmailRateLimited: Story = {
  beforeEach: () => {
    writeAnswer = { status: 429, code: "RATE_LIMITED", headers: { "Retry-After": "120" } };
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("heading", { level: 1, name: "Marina Costa" });
    await userEvent.click(canvas.getByRole("button", { name: "Enviar e-mail de redefinição de senha" }));
    await expect(
      await within(document.body).findByText("Muitas tentativas. Tente novamente em 2 minutos."),
    ).toBeVisible();
  },
};

/** Suspend from the profile: the dialog, one POST, and exactly one more profile fetch (W16, §9). */
export const SuspendRefetchesOnce: Story = {
  beforeEach: () => {
    writeAnswer = { status: 200 };
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("heading", { level: 1, name: "Marina Costa" });
    await userEvent.click(canvas.getByRole("button", { name: "Suspender" }));
    const dialog = within(await within(document.body).findByRole("dialog"));
    await userEvent.type(dialog.getByRole("textbox", { name: "Motivo" }), "Denúncia em análise");
    answer = { ...adminClientProfile, suspended: true, suspendedAt: "2026-11-18T14:00:00Z" };
    await userEvent.click(dialog.getByRole("button", { name: "Suspender" }));
    await expect(await within(document.body).findByText("A conta de Marina Costa foi suspensa.")).toBeVisible();
    await waitFor(() => expect(canvas.getByRole("button", { name: "Reativar" })).toBeVisible());
    await expect(writes()).toEqual(["POST /api/bff/admin/users/2/suspend"]);
    await expect(profileCalls()).toBe(2);
  },
};

/** "Encerrar vínculo com treinador": the confirm, one DELETE with both ids, one more profile fetch. */
export const EndRelationship: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole("heading", { level: 1, name: "Marina Costa" });
    await userEvent.click(canvas.getByRole("button", { name: "Encerrar vínculo com treinador" }));
    const dialog = within(await within(document.body).findByRole("dialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Encerrar vínculo" }));
    await expect(
      await within(document.body).findByText("Vínculo entre Marina Costa e Ana Ribeiro encerrado."),
    ).toBeVisible();
    await expect(writes()).toEqual(["DELETE /api/bff/admin/relationships/1/2"]);
    await waitFor(() => expect(profileCalls()).toBe(2));
  },
};
