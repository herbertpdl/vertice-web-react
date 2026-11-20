import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, waitFor, within } from "storybook/test";
import { ToastProvider } from "@/components/ui";
import {
  flagFetch,
  flagServer,
  listFetches,
  releaseLists,
  releaseWrites,
  resetFlagServer,
  writesSent,
} from "@/components/domain/flagStoryServer";
import { withSeededQueries } from "@/components/domain/storyQuery";
import { FeatureFlagContent } from "./FeatureFlagContent";

const meta = {
  component: FeatureFlagContent,
  args: { flagKey: "AI_ASSISTANT_ENABLED" },
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
    resetFlagServer();
    const original = window.fetch;
    window.fetch = flagFetch as typeof fetch;
    return () => {
      window.fetch = original;
    };
  },
} satisfies Meta<typeof FeatureFlagContent>;

export default meta;
type Story = StoryObj<typeof meta>;

const usersPath = "/admin/feature-flags/AI_ASSISTANT_ENABLED/users";
const userSwitch = (n: number) => `Configuração de usuário #${n}`;

/** The users table, once the flag has loaded (the table's head shows while it loads). */
async function usersTable(canvas: { findByRole: typeof screen.findByRole }) {
  await canvas.findByRole("switch", { name: /^Para todos: / });
  return within(await canvas.findByRole("table", { name: "Usuários com configuração própria" }));
}

async function addUser(
  canvas: Parameters<NonNullable<Story["play"]>>[0]["canvas"],
  userEvent: Parameters<NonNullable<Story["play"]>>[0]["userEvent"],
  text: string,
  setting?: "Desligado",
) {
  await usersTable(canvas);
  await userEvent.type(canvas.getByLabelText("Número do usuário"), text);
  if (setting) {
    await userEvent.click(canvas.getByRole("button", { name: "Configuração" }));
    await userEvent.click(within(await screen.findByRole("listbox")).getByRole("option", { name: setting }));
  }
  await userEvent.click(canvas.getByRole("button", { name: "Adicionar" }));
}

/** `gJQrD`: the header, everyone's state, the add form and the users with their own setting. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const table = await usersTable(canvas);
    await expect(canvas.getByRole("heading", { level: 1, name: "AI_ASSISTANT_ENABLED" })).toBeVisible();
    await expect(canvas.getByRole("switch", { name: "Para todos: AI_ASSISTANT_ENABLED" })).toBeChecked();
    await expect(table.getByText("Usuário #1234")).toBeVisible();
    await expect(table.getByRole("switch", { name: userSwitch(1) })).toBeChecked();
    await expect(table.getByRole("switch", { name: userSwitch(57) })).not.toBeChecked();
    await expect(table.getByRole("button", { name: "Remover usuário #57" })).toBeVisible();
    // Never a link to the user's profile (D7).
    await expect(table.queryByRole("link")).toBeNull();
    await expect(canvas.getByText("3", { selector: "span" })).toBeVisible();
  },
};

/** Add "Ligado": the body, the toast, the field cleared, focus kept there for the next number. */
export const AddLigado: Story = {
  play: async ({ canvas, userEvent }) => {
    await addUser(canvas, userEvent, " 42 ");
    await expect(await screen.findByText("Usuário #42 definido como Ligado.")).toBeVisible();
    await expect(writesSent()).toEqual([`PUT ${usersPath}/42 {"enabled":true}`]);
    const field = canvas.getByLabelText("Número do usuário");
    await expect(field).toHaveValue("");
    await waitFor(() => expect(field).toHaveFocus());
    await expect((await usersTable(canvas)).getByRole("switch", { name: userSwitch(42) })).toBeChecked();
  },
};

/** Add "Desligado"; the dropdown keeps its choice for the next number. */
export const AddDesligado: Story = {
  play: async ({ canvas, userEvent }) => {
    await addUser(canvas, userEvent, "99", "Desligado");
    await expect(await screen.findByText("Usuário #99 definido como Desligado.")).toBeVisible();
    await expect(writesSent()).toEqual([`PUT ${usersPath}/99 {"enabled":false}`]);
    await expect(canvas.getByRole("button", { name: "Configuração" })).toHaveTextContent("Desligado");
  },
};

/** `oONTU`: an invalid number shows the error and sends nothing. */
export const InvalidNumber: Story = {
  play: async ({ canvas, userEvent }) => {
    await addUser(canvas, userEvent, "12a");
    await expect(await canvas.findByText("Digite um número de usuário válido")).toBeVisible();
    await expect(writesSent()).toEqual([]);
  },
};

/** A double click on "Adicionar" sends one request (D9). */
export const DoubleClickAdd: Story = {
  beforeEach: () => {
    flagServer.write = "hold";
  },
  play: async ({ canvas, userEvent }) => {
    await usersTable(canvas);
    await userEvent.type(canvas.getByLabelText("Número do usuário"), "42");
    await userEvent.dblClick(canvas.getByRole("button", { name: "Adicionar" }));
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(flagServer.heldWrites).toHaveLength(1));
    releaseWrites();
    await expect(await screen.findByText("Usuário #42 definido como Ligado.")).toBeVisible();
    await expect(writesSent()).toHaveLength(1);
  },
};

/** The same number again replaces that user's setting (E15). */
export const AddExistingReplaces: Story = {
  play: async ({ canvas, userEvent }) => {
    await addUser(canvas, userEvent, "57");
    await expect(await screen.findByText("Usuário #57 definido como Ligado.")).toBeVisible();
    const table = await usersTable(canvas);
    await waitFor(() => expect(table.getByRole("switch", { name: userSwitch(57) })).toBeChecked());
    await expect(table.getAllByText("Usuário #57")).toHaveLength(1);
  },
};

/** A row switch sends the opposite of what it shows and stays put, pending, until the response. */
export const RowSwitch: Story = {
  beforeEach: () => {
    flagServer.write = "hold";
  },
  play: async ({ canvas, userEvent }) => {
    const toggle = (await usersTable(canvas)).getByRole("switch", { name: userSwitch(57) });
    await userEvent.click(toggle);
    await waitFor(() => expect(flagServer.heldWrites).toHaveLength(1));
    await expect(writesSent()).toEqual([`PUT ${usersPath}/57 {"enabled":true}`]);
    await expect(toggle).not.toBeChecked();
    await expect(toggle).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(toggle);
    await expect(writesSent()).toHaveLength(1);
    releaseWrites();
    await expect(await screen.findByText("Usuário #57 definido como Ligado.")).toBeVisible();
    await expect(toggle).toBeChecked();
    await expect(toggle).not.toHaveAttribute("aria-disabled");
  },
};

/** Remove shows "Removendo…", sends once, and the row goes (R16, E6). */
export const Remove: Story = {
  beforeEach: () => {
    flagServer.write = "hold";
  },
  play: async ({ canvas, userEvent }) => {
    const table = await usersTable(canvas);
    await userEvent.click(table.getByRole("button", { name: "Remover usuário #57" }));
    await expect(await table.findByText("Removendo…")).toBeVisible();
    await expect(writesSent()).toEqual([`DELETE ${usersPath}/57`]);
    releaseWrites();
    await expect(await screen.findByText("Usuário #57 agora segue a configuração para todos.")).toBeVisible();
    await waitFor(() => expect(table.queryByText("Usuário #57")).toBeNull());
    await expect(writesSent()).toHaveLength(1);
  },
};

/** `oONTU`: no user has an own setting. */
export const Empty: Story = {
  args: { flagKey: "FIRST_ACCESS_EMAIL_ENABLED" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Nenhum usuário com configuração própria")).toBeVisible();
    await expect(canvas.getByText("Todos seguem a configuração para todos.")).toBeVisible();
    await expect(canvas.getByRole("switch", { name: "Para todos: FIRST_ACCESS_EMAIL_ENABLED" })).not.toBeChecked();
  },
};

/** `MzesP`: the key from the URL, skeletons, and no "off" switch announced before it is known. */
export const Loading: Story = {
  beforeEach: () => {
    flagServer.list = "pending";
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "AI_ASSISTANT_ENABLED" })).toBeVisible();
    await expect(await canvas.findByLabelText("Carregando")).toBeInTheDocument();
    await expect(canvas.queryByRole("switch")).toBeNull();
    await expect(canvas.getByText("Carregando configuração para todos")).toBeInTheDocument();
    await expect(canvas.getByLabelText("Número do usuário")).toBeDisabled();
  },
};

/** The list failed: the key from the URL and the list's error with "Tentar novamente". */
export const ListError: Story = {
  beforeEach: () => {
    flagServer.list = "error";
  },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText("Não foi possível carregar as flags")).toBeVisible();
    await expect(canvas.getByRole("heading", { level: 1, name: "AI_ASSISTANT_ENABLED" })).toBeVisible();
    flagServer.list = "ok";
    await userEvent.click(canvas.getByRole("button", { name: "Tentar novamente" }));
    await usersTable(canvas);
  },
};

/** `vJYcq`: a key that isn't in the list. */
export const UnknownKey: Story = {
  args: { flagKey: "NO_SUCH_FLAG" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: "Flag não encontrada" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Voltar para Feature flags" })).toHaveAttribute("href", "/painel/flags");
    await expect(canvas.queryByLabelText("Número do usuário")).toBeNull();
  },
};

/** E9: a write's 404: the toast, then "Flag não encontrada", with focus on its heading. */
export const WriteGone: Story = {
  beforeEach: () => {
    flagServer.write = "gone";
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click((await usersTable(canvas)).getByRole("switch", { name: userSwitch(57) }));
    await expect(await screen.findByText("Esta flag não existe mais. A lista foi atualizada.")).toBeVisible();
    const heading = await canvas.findByRole("heading", { name: "Flag não encontrada" });
    await waitFor(() => expect(heading).toHaveFocus());
  },
};

/**
 * Two rows saved at once (D4): row A's save lands and its list refetch is held; row B's save
 * cancels that refetch with its own. A stays pending, unchanged and with no toast, until a list
 * with its saved state lands, then re-enables showing it.
 */
export const TwoRowsAtOnce: Story = {
  play: async ({ canvas, userEvent }) => {
    const table = await usersTable(canvas);
    const a = table.getByRole("switch", { name: userSwitch(1) });
    const b = table.getByRole("switch", { name: userSwitch(1234) });
    const fetchesBefore = listFetches();
    flagServer.holdLists = true;

    await userEvent.click(a);
    await waitFor(() => expect(flagServer.heldLists).toHaveLength(1));
    await userEvent.click(b);
    await waitFor(() => expect(flagServer.heldLists).toHaveLength(2));
    await expect(writesSent()).toEqual([`PUT ${usersPath}/1 {"enabled":false}`, `PUT ${usersPath}/1234 {"enabled":false}`]);
    await expect(listFetches()).toBe(fetchesBefore + 2);

    await expect(a).toBeChecked();
    await expect(a).toHaveAttribute("aria-disabled", "true");
    await expect(screen.queryByText("Usuário #1 definido como Desligado.")).toBeNull();

    releaseLists();
    await expect(await screen.findByText("Usuário #1 definido como Desligado.")).toBeVisible();
    await waitFor(() => expect(a).not.toHaveAttribute("aria-disabled"));
    await expect(a).not.toBeChecked();
    await waitFor(() => expect(b).not.toBeChecked());
  },
};

/**
 * Keyboard (§10): Space on a row switch keeps focus through the save (`aria-disabled`, never
 * `disabled`); a second Space sends nothing; afterwards it shows the new state, still focused.
 */
export const KeyboardSwitch: Story = {
  beforeEach: () => {
    flagServer.write = "hold";
  },
  play: async ({ canvas, userEvent }) => {
    const table = await usersTable(canvas);
    table.getByRole("switch", { name: userSwitch(1) }).focus();
    await userEvent.tab();
    await userEvent.tab();
    const toggle = table.getByRole("switch", { name: userSwitch(57) });
    await expect(toggle).toHaveFocus();
    await userEvent.keyboard(" ");
    await waitFor(() => expect(flagServer.heldWrites).toHaveLength(1));
    await expect(toggle).toHaveAttribute("aria-disabled", "true");
    await expect(toggle).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(writesSent()).toHaveLength(1);
    releaseWrites();
    await expect(await screen.findByText("Usuário #57 definido como Ligado.")).toBeVisible();
    await expect(toggle).toBeChecked();
    await expect(toggle).toHaveFocus();
  },
};

/** Keyboard remove: focus goes to the next row's switch; removing the only row, to the number field. */
export const KeyboardRemove: Story = {
  play: async ({ canvas, userEvent }) => {
    const table = await usersTable(canvas);
    table.getByRole("button", { name: "Remover usuário #57" }).focus();
    await userEvent.keyboard("{Enter}");
    await expect(await screen.findByText("Usuário #57 agora segue a configuração para todos.")).toBeVisible();
    await waitFor(() => expect(table.getByRole("switch", { name: userSwitch(1234) })).toHaveFocus());

    // The last row: the previous row's switch.
    table.getByRole("button", { name: "Remover usuário #1234" }).focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(table.getByRole("switch", { name: userSwitch(1) })).toHaveFocus());

    // The only row left: the number field.
    table.getByRole("button", { name: "Remover usuário #1" }).focus();
    await userEvent.keyboard("{Enter}");
    await expect(await canvas.findByText("Nenhum usuário com configuração própria")).toBeVisible();
    await waitFor(() => expect(canvas.getByLabelText("Número do usuário")).toHaveFocus());
  },
};
