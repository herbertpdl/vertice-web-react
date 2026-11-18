import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRouter, useSearchParams } from "@storybook/nextjs-vite/navigation.mock";
import { expect, fn } from "storybook/test";
import { LoginForm } from "./LoginForm";

function stub(search: string) {
  // Not `nextjs: { appDirectory: true }`, see WorkoutEditorSession.stories.tsx: stubbed
  // `next/navigation` hooks on the default decorator.
  useRouter.mockReturnValue({
    back: fn(),
    forward: fn(),
    refresh: fn(),
    hmrRefresh: fn(),
    push: fn(),
    replace: fn(),
    prefetch: fn(),
  } as unknown as ReturnType<typeof useRouter>);
  useSearchParams.mockReturnValue(
    new URLSearchParams(search) as unknown as ReturnType<typeof useSearchParams>,
  );
}

const meta = {
  component: LoginForm,
  beforeEach: () => stub(""),
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Bem-vindo de volta" })).toBeVisible();
    await expect(canvas.queryByRole("status")).toBeNull();
  },
};

/** Where "Excluir conta" lands once the account is gone. */
export const AccountDeleted: Story = {
  beforeEach: () => stub("aviso=conta-excluida"),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Sua conta foi excluída.");
  },
};

/** Where the app's gate sends a client's (or admin's) session: the "use the app" message (R7). */
export const SentToTheApp: Story = {
  beforeEach: () => stub("motivo=app"),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "O acesso de alunos é feito somente pelo aplicativo Vertice.",
    );
  },
};

/** R41, E18: a suspended account's correct password reads the suspended copy, never the BFF's text. */
export const Suspended: Story = {
  beforeEach: () => {
    const original = window.fetch;
    window.fetch = (async () =>
      Response.json(
        { error: { code: "ACCOUNT_SUSPENDED", message: "Account suspended" } },
        { status: 403 },
      )) as typeof fetch;
    return () => {
      window.fetch = original;
    };
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText("Email"), "ana@email.com");
    await userEvent.type(canvas.getByLabelText("Senha"), "senha-segura-1");
    await userEvent.click(canvas.getByRole("button", { name: "Entrar" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Sua conta está suspensa. Entre em contato com o suporte.",
    );
  },
};
