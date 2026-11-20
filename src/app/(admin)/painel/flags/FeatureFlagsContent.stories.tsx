import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRouter } from "@storybook/nextjs-vite/navigation.mock";
import type { QueryClient } from "@tanstack/react-query";
import { expect, fn, screen, waitFor, within } from "storybook/test";
import { ToastProvider } from "@/components/ui";
import { flagFetch, flagServer, resetFlagServer, writesSent } from "@/components/domain/flagStoryServer";
import { withSeededQueries } from "@/components/domain/storyQuery";
import { FeatureFlagsContent } from "./FeatureFlagsContent";

const replace = fn();
let client: QueryClient | null = null;

const meta = {
  component: FeatureFlagsContent,
  args: { initialQuery: "" },
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
    withSeededQueries({}, { onClient: (seeded) => (client = seeded) }),
  ],
  beforeEach: () => {
    resetFlagServer();
    replace.mockClear();
    useRouter.mockReturnValue({ replace, push: fn(), prefetch: fn(), back: fn(), forward: fn(), refresh: fn() } as unknown as ReturnType<typeof useRouter>);
    const original = window.fetch;
    window.fetch = flagFetch as typeof fetch;
    return () => {
      window.fetch = original;
    };
  },
} satisfies Meta<typeof FeatureFlagsContent>;

export default meta;
type Story = StoryObj<typeof meta>;

const emailSwitch = "Para todos: FIRST_ACCESS_EMAIL_ENABLED";

/** `ufeI3`: both flags, key over description, the everyone state and the user-settings count. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const table = within(await canvas.findByRole("table", { name: "Feature flags" }));
    await expect(await table.findByText("AI_ASSISTANT_ENABLED")).toBeVisible();
    await expect(table.getByText(/Assistente de IA no editor de treino/)).toBeVisible();
    await expect(table.getByRole("switch", { name: "Para todos: AI_ASSISTANT_ENABLED" })).toBeChecked();
    await expect(table.getByRole("switch", { name: emailSwitch })).not.toBeChecked();
    await expect(table.getByText("Ligado")).toBeVisible();
    await expect(table.getByText("Desligado")).toBeVisible();
    await expect(table.getByText("3 usuários")).toBeVisible();
    await expect(table.getByText("Nenhum usuário")).toBeVisible();
    await expect(table.getByRole("link", { name: "Ver usuários de FIRST_ACCESS_EMAIL_ENABLED" })).toHaveAttribute(
      "href",
      "/painel/flags/FIRST_ACCESS_EMAIL_ENABLED",
    );
    await expect(canvas.getByText("2 flags")).toBeVisible();
  },
};

/** `tw3jw`: the search matches the description too, ignoring accents, and lives in `?q=`. */
export const SearchMatch: Story = {
  args: { initialQuery: "assistente" },
  play: async ({ canvas, userEvent }) => {
    const table = within(await canvas.findByRole("table", { name: "Feature flags" }));
    await expect(await table.findByText("AI_ASSISTANT_ENABLED")).toBeVisible();
    await expect(table.queryByText("FIRST_ACCESS_EMAIL_ENABLED")).toBeNull();
    await expect(canvas.getByText("1 de 2 flags")).toBeVisible();
    const field = canvas.getByLabelText("Buscar");
    await userEvent.clear(field);
    await userEvent.type(field, "e-mail");
    await expect(await table.findByText("FIRST_ACCESS_EMAIL_ENABLED")).toBeVisible();
    await waitFor(() => expect(replace).toHaveBeenLastCalledWith("/painel/flags?q=e-mail", { scroll: false }));
  },
};

/** `A3vAb`: nothing matches, and "Limpar busca" brings every flag back. */
export const NoMatch: Story = {
  args: { initialQuery: "pagamento" },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText("Nenhuma flag encontrada")).toBeVisible();
    await expect(canvas.getByText("Confira o texto, ou limpe a busca.")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Limpar busca" }));
    await expect(await canvas.findByRole("switch", { name: "Para todos: AI_ASSISTANT_ENABLED" })).toBeVisible();
    await expect(canvas.getByLabelText("Buscar")).toHaveValue("");
    await waitFor(() => expect(replace).toHaveBeenLastCalledWith("/painel/flags", { scroll: false }));
  },
};

export const Loading: Story = {
  beforeEach: () => {
    flagServer.list = "pending";
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Carregando")).toBeInTheDocument();
  },
};

/** `Xp9eO`: the list failed; "Tentar novamente" loads it. */
export const ErrorAndRetry: Story = {
  beforeEach: () => {
    flagServer.list = "error";
  },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText("Não foi possível carregar as flags")).toBeVisible();
    flagServer.list = "ok";
    await userEvent.click(canvas.getByRole("button", { name: "Tentar novamente" }));
    await expect(await canvas.findByRole("switch", { name: "Para todos: AI_ASSISTANT_ENABLED" })).toBeVisible();
  },
};

/** `pGJVX`: the switch asks first and doesn't move; Cancelar sends nothing (E13). */
export const SwitchAsksAndCancel: Story = {
  play: async ({ canvas, userEvent }) => {
    const toggle = await canvas.findByRole("switch", { name: emailSwitch });
    await userEvent.click(toggle);
    const dialog = within(await screen.findByRole("dialog", { name: "Ligar para todos?" }));
    await expect(toggle).not.toBeChecked();
    await expect(
      dialog.getByText(/ficará ligada para todos os usuários sem configuração própria/),
    ).toBeVisible();
    await userEvent.click(dialog.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(writesSent()).toEqual([]);
    await expect(toggle).not.toBeChecked();
  },
};

/**
 * W4: the dialog sends the state captured on click, once, even after a refetch turned the flag on
 * behind it. Then the switch shows the saved state, the toast says so, and focus is back on it.
 */
export const ConfirmSendsCapturedState: Story = {
  play: async ({ canvas, userEvent }) => {
    const toggle = await canvas.findByRole("switch", { name: emailSwitch });
    await userEvent.click(toggle);
    const dialog = within(await screen.findByRole("dialog", { name: "Ligar para todos?" }));

    // Another admin turned it on; a refetch lands while the dialog is open.
    flagServer.flags[1].enabled = true;
    await client!.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
    await waitFor(() => expect(toggle).toBeChecked());
    await expect(dialog.getByRole("heading", { name: "Ligar para todos?" })).toBeVisible();

    await userEvent.dblClick(dialog.getByRole("button", { name: "Ligar para todos" }));
    await expect(await screen.findByText("A flag FIRST_ACCESS_EMAIL_ENABLED foi ligada para todos.")).toBeVisible();
    await expect(writesSent()).toEqual(['PUT /admin/feature-flags/FIRST_ACCESS_EMAIL_ENABLED/everyone {"enabled":true}']);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(toggle).toBeChecked();
    await waitFor(() => expect(toggle).toHaveFocus());
  },
};

/** `vBk8U`: a failed save stays in the dialog with its copy; the admin can retry or cancel. */
export const FailedConfirm: Story = {
  beforeEach: () => {
    flagServer.write = "fail";
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("switch", { name: "Para todos: AI_ASSISTANT_ENABLED" }));
    const dialog = within(await screen.findByRole("dialog", { name: "Desligar para todos?" }));
    await userEvent.click(dialog.getByRole("button", { name: "Desligar para todos" }));
    await expect(await dialog.findByRole("alert")).toHaveTextContent("Não foi possível salvar. Tente de novo.");
    await expect(canvas.getByRole("switch", { name: "Para todos: AI_ASSISTANT_ENABLED" })).toBeChecked();
  },
};

/** E9: the flag was removed: the dialog closes, the toast says so, and the list drops it. */
export const FlagGone: Story = {
  beforeEach: () => {
    flagServer.write = "gone";
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("switch", { name: emailSwitch }));
    const dialog = within(await screen.findByRole("dialog", { name: "Ligar para todos?" }));
    await userEvent.click(dialog.getByRole("button", { name: "Ligar para todos" }));
    await expect(await screen.findByText("Esta flag não existe mais. A lista foi atualizada.")).toBeVisible();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(canvas.queryByText("FIRST_ACCESS_EMAIL_ENABLED")).toBeNull());
    await expect(canvas.getByText("1 flag")).toBeVisible();
    // The switch that opened the dialog is gone: focus lands on the search field.
    await waitFor(() => expect(canvas.getByLabelText("Buscar")).toHaveFocus());
  },
};
