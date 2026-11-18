import type { Meta, StoryContext, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor } from "storybook/test";
import { AdminAuthShell } from "@/components/layout/AdminAuthShell";
import { AdminLoginContent } from "./AdminLoginContent";

// No BFF in Storybook: each story answers the `/api/admin/auth/*` calls itself.
type Responder = (url: string, init?: RequestInit) => Response | Promise<Response>;

const URI = "otpauth://totp/Vertice:carla%40vertice.fit?secret=JBSWY3DPEHPK3PXP&issuer=Vertice";

const challenge = (secondFactor: "ENROLLED" | "NOT_ENROLLED") => () =>
  Response.json({ secondFactor, challengeExpiresAt: new Date(Date.now() + 300_000).toISOString(), challengeExpiresIn: 300 });
const error = (status: number, code: string, headers: Record<string, string> = {}) => () =>
  Response.json({ error: { code, message: code } }, { status, headers });

let routes: Record<string, Responder> = {};
const adminFetch = fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  const route = routes[url];
  if (!route) return Response.json({ ok: true });
  return route(url, init);
});

function answer(next: Record<string, Responder>) {
  return () => {
    routes = next;
  };
}

const meta = {
  component: AdminLoginContent,
  args: { expired: false, redirect: null },
  decorators: [
    (Story) => (
      <AdminAuthShell host="admin.vertice.fit">
        <Story />
      </AdminAuthShell>
    ),
  ],
  parameters: { layout: "fullscreen" },
  beforeEach: () => {
    const original = window.fetch;
    adminFetch.mockClear();
    routes = {};
    window.fetch = adminFetch as typeof fetch;
    return () => {
      window.fetch = original;
    };
  },
} satisfies Meta<typeof AdminLoginContent>;

export default meta;
type Story = StoryObj<typeof meta>;

async function signIn({ canvas, userEvent }: StoryContext) {
  await userEvent.type(canvas.getByLabelText("E-mail"), "carla@vertice.fit");
  await userEvent.type(canvas.getByLabelText("Senha"), "senha-certa");
  await userEvent.click(canvas.getByRole("button", { name: "Entrar" }));
}

async function typeCode(context: StoryContext, code: string, submit: string) {
  const { canvas, userEvent } = context;
  await userEvent.type(await canvas.findByLabelText("Código de 6 dígitos"), code);
  await userEvent.click(canvas.getByRole("button", { name: submit }));
}

/** `xtHYu`: the password step. No "Esqueceu a senha?" (owner's choice) and no "remember me". */
export const Password: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Entrar no painel" })).toBeVisible();
    await expect(canvas.queryByRole("checkbox")).toBeNull();
    await expect(canvas.queryByRole("status")).toBeNull();
  },
};

/** `cb0r1`: `?motivo=expirou`, the notice and its footnote. */
export const SessionExpired: Story = {
  args: { expired: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Sua sessão expirou. Entre novamente.");
    await expect(
      canvas.getByText("Por segurança, a sessão termina após 30 minutos sem uso ou 12 horas depois do login."),
    ).toBeVisible();
  },
};

/** After the admin's own password change (E42): every session ended; sign in again. */
export const PasswordChanged: Story = {
  args: { passwordChanged: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Senha alterada. Entre com a nova senha.");
  },
};

/** `KV3fb`: a wrong password, and a trainer's or client's correct one, read the same (R4). */
export const InvalidCredentials: Story = {
  beforeEach: answer({ "/api/admin/auth/login": error(401, "UNAUTHORIZED") }),
  play: async (context) => {
    await signIn(context);
    await expect(await context.canvas.findByRole("alert")).toHaveTextContent("E-mail ou senha inválidos");
    await expect(context.canvas.getByLabelText("Senha")).toHaveValue("");
  },
};

/** R41: a suspended admin. */
export const Suspended: Story = {
  beforeEach: answer({ "/api/admin/auth/login": error(403, "ACCOUNT_SUSPENDED") }),
  play: async (context) => {
    await signIn(context);
    await expect(await context.canvas.findByRole("alert")).toHaveTextContent(
      "Sua conta está suspensa. Entre em contato com o suporte.",
    );
  },
};

/** A 429 keeps "Entrar" disabled until Retry-After has passed. */
export const RateLimited: Story = {
  beforeEach: answer({ "/api/admin/auth/login": error(429, "RATE_LIMITED", { "Retry-After": "600" }) }),
  play: async (context) => {
    await signIn(context);
    await expect(await context.canvas.findByRole("alert")).toHaveTextContent(
      "Muitas tentativas. Tente novamente em 10 minutos.",
    );
    await expect(context.canvas.getByRole("button", { name: "Entrar" })).toBeDisabled();
  },
};

/** `Cv0BV`: first access. The QR is drawn locally from the URI, with the key in groups of four. */
export const Enrollment: Story = {
  beforeEach: answer({
    "/api/admin/auth/login": challenge("NOT_ENROLLED"),
    "/api/admin/auth/enroll": () => Response.json({ provisioningUri: URI }),
  }),
  play: async (context) => {
    const { canvas } = context;
    await signIn(context);
    await expect(
      await canvas.findByRole("heading", { name: "Configure a verificação em duas etapas" }),
    ).toBeVisible();
    await expect(await canvas.findByRole("img", { name: "QR code para configurar o app autenticador" })).toHaveAttribute(
      "src",
      expect.stringMatching(/^data:image\/svg\+xml/),
    );
    await expect(canvas.getByText("JBSW Y3DP EHPK 3PXP")).toBeVisible();
    // Enroll was called once, from the login answer (never from an effect).
    await expect(adminFetch.mock.calls.filter(([url]) => url === "/api/admin/auth/enroll")).toHaveLength(1);
    // No third-party QR service: every call stayed on this app.
    for (const [url] of adminFetch.mock.calls) await expect(String(url)).toMatch(/^\/api\/admin\/auth\//);
  },
};

/** `p5TLVn`: a wrong code during enrolment keeps the step and the challenge. */
export const EnrollmentInvalidCode: Story = {
  beforeEach: answer({
    "/api/admin/auth/login": challenge("NOT_ENROLLED"),
    "/api/admin/auth/enroll": () => Response.json({ provisioningUri: URI }),
    "/api/admin/auth/verify": error(400, "INVALID_SECOND_FACTOR_CODE"),
  }),
  play: async (context) => {
    const { canvas } = context;
    await signIn(context);
    await canvas.findByText("JBSW Y3DP EHPK 3PXP");
    await typeCode(context, "482190", "Ativar e entrar");
    await expect(await canvas.findByText("Código inválido")).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Configure a verificação em duas etapas" })).toBeVisible();
  },
};

/** An enroll 409 (already enrolled) moves to the code step. */
export const AlreadyEnrolled: Story = {
  beforeEach: answer({
    "/api/admin/auth/login": challenge("NOT_ENROLLED"),
    "/api/admin/auth/enroll": error(409, "PRECONDITION_FAILED"),
  }),
  play: async (context) => {
    await signIn(context);
    await expect(await context.canvas.findByRole("heading", { name: "Verificação em duas etapas" })).toBeVisible();
  },
};

/** `duiOr`: the code step for an enrolled admin; the code goes to verify, the challenge never leaves the cookie. */
export const Code: Story = {
  beforeEach: answer({ "/api/admin/auth/login": challenge("ENROLLED") }),
  play: async (context) => {
    const { canvas } = context;
    await signIn(context);
    await expect(await canvas.findByRole("heading", { name: "Verificação em duas etapas" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Voltar para o login" })).toBeVisible();
  },
};

/** `q9XrXD`: a wrong code. */
export const CodeInvalid: Story = {
  beforeEach: answer({
    "/api/admin/auth/login": challenge("ENROLLED"),
    "/api/admin/auth/verify": error(400, "INVALID_SECOND_FACTOR_CODE"),
  }),
  play: async (context) => {
    const { canvas } = context;
    await signIn(context);
    await typeCode(context, "119034", "Verificar");
    await expect(await canvas.findByText("Código inválido")).toBeVisible();
    const verify = adminFetch.mock.calls.find(([url]) => url === "/api/admin/auth/verify");
    await expect(JSON.parse(String(verify?.[1]?.body))).toEqual({ code: "119034" });
  },
};

/** A malformed code never reaches the server. */
export const CodeIncomplete: Story = {
  beforeEach: answer({ "/api/admin/auth/login": challenge("ENROLLED") }),
  play: async (context) => {
    const { canvas } = context;
    await signIn(context);
    await typeCode(context, "1190", "Verificar");
    await expect(await canvas.findByText("Digite os 6 dígitos do código")).toBeVisible();
    await expect(adminFetch.mock.calls.some(([url]) => url === "/api/admin/auth/verify")).toBe(false);
  },
};

/** A challenge past its deadline at submit restarts without posting (deadline counted from receipt). */
export const ChallengeExpiredAtSubmit: Story = {
  beforeEach: answer({
    "/api/admin/auth/login": () =>
      Response.json({ secondFactor: "ENROLLED", challengeExpiresAt: "2000-01-01T00:00:00Z", challengeExpiresIn: 0 }),
  }),
  play: async (context) => {
    const { canvas } = context;
    await signIn(context);
    await typeCode(context, "119034", "Verificar");
    await expect(await canvas.findByRole("status")).toHaveTextContent("Sua sessão expirou. Entre novamente.");
    await expect(adminFetch.mock.calls.some(([url]) => url === "/api/admin/auth/verify")).toBe(false);
  },
};

/** CHALLENGE_INVALID at verify: back to the password with the expiry notice (W10). */
export const ChallengeEnded: Story = {
  beforeEach: answer({
    "/api/admin/auth/login": challenge("ENROLLED"),
    "/api/admin/auth/verify": error(401, "CHALLENGE_INVALID"),
  }),
  play: async (context) => {
    const { canvas } = context;
    await signIn(context);
    await typeCode(context, "119034", "Verificar");
    await expect(await canvas.findByRole("heading", { name: "Entrar no painel" })).toBeVisible();
    await expect(canvas.getByRole("status")).toHaveTextContent("Sua sessão expirou. Entre novamente.");
  },
};

/** "Voltar para o login" clears the challenge server-side, then shows the password step. */
export const BackToPassword: Story = {
  beforeEach: answer({ "/api/admin/auth/login": challenge("ENROLLED") }),
  play: async (context) => {
    const { canvas, userEvent } = context;
    await signIn(context);
    await userEvent.click(await canvas.findByRole("button", { name: "Voltar para o login" }));
    await expect(await canvas.findByRole("heading", { name: "Entrar no painel" })).toBeVisible();
    await waitFor(() =>
      expect(adminFetch.mock.calls.some(([url]) => url === "/api/admin/auth/logout")).toBe(true),
    );
    await expect(canvas.queryByRole("status")).toBeNull();
  },
};
