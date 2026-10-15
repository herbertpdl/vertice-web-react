import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect, fn, waitFor } from "storybook/test";
import { RegisterForm } from "./RegisterForm";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";

// RegisterForm posts to this app's /api/auth/register itself; the story stands in for it.
const registerFetch = fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  void input;
  void init;
  return Response.json({ user: { id: 1, name: "Ana Ribeiro", email: "ana@example.com", role: "TRAINER" } });
});

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

const meta = {
  component: RegisterForm,
  beforeEach: () => {
    stubRouter();
    const original = window.fetch;
    registerFetch.mockClear();
    window.fetch = registerFetch as typeof fetch;
    return () => {
      window.fetch = original;
    };
  },
} satisfies Meta<typeof RegisterForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The terms checkbox links to both legal pages, in a new tab (the form keeps what was typed). */
export const LegalLinks: Story = {
  play: async ({ canvas }) => {
    for (const [name, href] of [
      ["Termos de Uso", "/termos"],
      ["Política de Privacidade", "/privacidade"],
    ]) {
      const link = canvas.getByRole("link", { name });
      await expect(link).toHaveAttribute("href", href);
      await expect(link).toHaveAttribute("target", "_blank");
    }
  },
};

/** Submitting sends the version of the texts the links open. */
export const SendsAcceptedTermsVersion: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText("Nome completo"), "Ana Ribeiro");
    await userEvent.type(canvas.getByLabelText("Email"), "ana@example.com");
    await userEvent.type(canvas.getByLabelText("CPF"), "52998224725");
    await userEvent.type(canvas.getByLabelText("Senha"), "senha-forte-123");
    await userEvent.type(canvas.getByLabelText("Confirmar senha"), "senha-forte-123");
    await userEvent.click(
      canvas.getByRole("checkbox", {
        name: "Concordo com os Termos de Uso e a Política de Privacidade",
      }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Criar conta" }));

    await waitFor(() => expect(registerFetch).toHaveBeenCalledOnce());
    const [url, init] = registerFetch.mock.calls[0];
    await expect(url).toBe("/api/auth/register");
    await expect(JSON.parse(init!.body as string)).toMatchObject({
      email: "ana@example.com",
      cpf: "52998224725",
      acceptedTermsVersion: LEGAL_VERSIONS.terms,
    });
  },
};

/** Not accepting the terms blocks the submit. */
export const TermsRequired: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Criar conta" }));
    await expect(await canvas.findByText("É necessário aceitar os termos de uso")).toBeVisible();
    await expect(registerFetch).not.toHaveBeenCalled();
  },
};
