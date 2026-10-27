import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect, fn, waitFor, within } from "storybook/test";
import { TermsConsentGate } from "./TermsConsentGate";
import { withSeededQueries } from "@/components/domain/storyQuery";
import { ApiError } from "@/lib/api/client";
import type { Consent, Me } from "@/lib/api/types";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";

const noConsent: Consent = {
  termsVersion: null,
  termsAcceptedAt: null,
  healthDataVersion: null,
  healthDataConsentAt: null,
};

const accepted: Consent = {
  ...noConsent,
  termsVersion: LEGAL_VERSIONS.terms,
  termsAcceptedAt: "2026-10-14T12:00:00.000Z",
};

function me(consent: Consent): Me {
  return {
    id: 1,
    name: "Ana Ribeiro",
    email: "ana@example.com",
    cpf: "***.***.***-25",
    cref: "",
    role: "TRAINER",
    whatsapp: "",
    instagram: "",
    showEmail: false,
    showWhatsapp: false,
    showInstagram: false,
    consent,
  };
}

function stubRouter() {
  // Not `nextjs: { appDirectory: true }`, see WorkoutEditorSession.stories.tsx: a stubbed
  // `next/navigation` `useRouter` on the default decorator.
  useRouter.mockReturnValue({
    back: fn(),
    forward: fn(),
    refresh: fn(),
    hmrRefresh: fn(),
    push: fn(),
    replace: fn(),
    prefetch: fn(),
  } as unknown as ReturnType<typeof useRouter>);
}

/** The gate also fetches `["legalVersions"]` (drift warning): seed it so no story hits the network. */
const legalVersions = { '["legalVersions"]': { ...LEGAL_VERSIONS } };

function seeded(user: Me | undefined, states: Parameters<typeof withSeededQueries>[1] = {}) {
  return withSeededQueries(user ? { '["me"]': user, ...legalVersions } : legalVersions, states);
}

const PAGE = "Conteúdo da página";

const meta = {
  component: TermsConsentGate,
  args: {
    children: <p>{PAGE}</p>,
    api: { recordConsent: fn(async () => accepted) },
  },
  decorators: [seeded(me(noConsent))],
  beforeEach: stubRouter,
} satisfies Meta<typeof TermsConsentGate>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Never accepted (registered before P1-04, or a client created by their trainer). */
export const FirstAccess: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Antes de continuar" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Termos de Uso" })).toHaveAttribute("href", "/termos");
    await expect(canvas.getByRole("link", { name: "Política de Privacidade" })).toHaveAttribute(
      "href",
      "/privacidade",
    );
    await expect(canvas.getByRole("button", { name: "Sair" })).toBeEnabled();
    await expect(canvas.queryByText(PAGE)).toBeNull();
  },
};

/** Accepted an earlier version: the texts changed, ask again. */
export const OutdatedVersion: Story = {
  decorators: [seeded(me({ ...accepted, termsVersion: "2026-01-draft" }))],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Atualizamos nossos termos" })).toBeVisible();
    await expect(canvas.queryByText(PAGE)).toBeNull();
  },
};

/** Accepted the current version: the page renders, no notice. */
export const CurrentVersion: Story = {
  decorators: [seeded(me(accepted))],
  play: async ({ canvas }) => {
    await expect(canvas.getByText(PAGE)).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Aceitar" })).toBeNull();
  },
};

/** "Aceitar" records TERMS with the current version, then the page renders. */
export const Accept: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Aceitar" }));
    await expect(args.api!.recordConsent).toHaveBeenCalledWith({
      type: "TERMS",
      version: LEGAL_VERSIONS.terms,
    });
    await expect(await canvas.findByText(PAGE)).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Aceitar" })).toBeNull();
  },
};

/** Recording failed: say so and keep the page blocked. */
export const AcceptFails: Story = {
  args: {
    api: {
      recordConsent: fn(async () => {
        throw new ApiError({ code: "UPSTREAM_UNAVAILABLE", message: "Unavailable" }, 503);
      }),
    },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Aceitar" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "O serviço está indisponível no momento",
    );
    await expect(canvas.queryByText(PAGE)).toBeNull();
  },
};

/** `GET /auth/me` still loading. */
export const Loading: Story = {
  decorators: [seeded(undefined, { pending: ['["me"]'] })],
  play: async ({ canvas }) => {
    await expect(within(document.body).getByText("Carregando...")).toBeVisible();
    await expect(canvas.queryByText(PAGE)).toBeNull();
  },
};

/** `GET /auth/me` failed (429, 5xx, network) with nothing to fall back on: fail closed. */
export const LoadFailed: Story = {
  decorators: [seeded(undefined, { failing: ['["me"]'] })],
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Não foi possível carregar sua conta" }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Tentar novamente" })).toBeEnabled();
    await expect(canvas.getByRole("button", { name: "Sair" })).toBeEnabled();
    await expect(canvas.queryByText(PAGE)).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Aceitar" })).toBeNull();
  },
};

/** Marks `["me"]` as failed while keeping its data: a background refetch that failed. */
function failedRefetch(user: Me) {
  return seeded(user, {
    onClient: (client) => {
      const query = client.getQueryCache().find({ queryKey: ["me"] })!;
      query.setState({
        status: "error",
        fetchStatus: "idle",
        error: new ApiError({ code: "UPSTREAM_UNAVAILABLE", message: "Unavailable" }, 503),
        errorUpdatedAt: Date.now(),
        errorUpdateCount: 1,
      });
    },
  });
}

/** A failed refetch doesn't reveal the page: the last `me` (not accepted) still decides. */
export const RefetchFailedNotAccepted: Story = {
  decorators: [failedRefetch(me(noConsent))],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Antes de continuar" })).toBeVisible();
    await expect(canvas.queryByText(PAGE)).toBeNull();
  },
};

/** ...nor hides it when the last `me` had accepted the current version. */
export const RefetchFailedAccepted: Story = {
  decorators: [failedRefetch(me(accepted))],
  play: async ({ canvas }) => {
    await expect(canvas.getByText(PAGE)).toBeVisible();
  },
};

/**
 * A client's session (R6, R7): never the page, not even the consent notice; it is signed out and
 * sent to the login with the "use the app" message.
 */
export const ClientSession: Story = {
  decorators: [seeded({ ...me(accepted), role: "CLIENT" })],
  play: async ({ canvas }) => {
    await waitFor(() => expect(useRouter().push).toHaveBeenCalledWith("/login?motivo=app"));
    await expect(canvas.queryByText(PAGE)).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Aceitar" })).toBeNull();
  },
};

/** An admin's session gets the same: the web is the trainer's (R5). */
export const AdminSession: Story = {
  decorators: [seeded({ ...me(noConsent), role: "ADMIN" })],
  play: async ({ canvas }) => {
    await waitFor(() => expect(useRouter().push).toHaveBeenCalledWith("/login?motivo=app"));
    await expect(canvas.queryByText(PAGE)).toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Antes de continuar" })).toBeNull();
  },
};
