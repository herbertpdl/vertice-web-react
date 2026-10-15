import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect, fn, within } from "storybook/test";
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
  return { id: 1, name: "Ana Ribeiro", email: "ana@example.com", cref: "", role: "TRAINER", consent };
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

const PAGE = "Conteúdo da página";

const meta = {
  component: TermsConsentGate,
  args: {
    children: <p>{PAGE}</p>,
    api: { recordConsent: fn(async () => accepted) },
  },
  decorators: [withSeededQueries({ '["me"]': me(noConsent) })],
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
  decorators: [
    withSeededQueries({
      '["me"]': me({ ...accepted, termsVersion: "2026-01-draft" }),
    }),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Atualizamos nossos termos" })).toBeVisible();
    await expect(canvas.queryByText(PAGE)).toBeNull();
  },
};

/** Accepted the current version: the page renders, no notice. */
export const CurrentVersion: Story = {
  decorators: [withSeededQueries({ '["me"]': me(accepted) })],
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
  decorators: [withSeededQueries({}, { pending: ['["me"]'] })],
  play: async () => {
    await expect(within(document.body).getByText("Carregando...")).toBeVisible();
  },
};
