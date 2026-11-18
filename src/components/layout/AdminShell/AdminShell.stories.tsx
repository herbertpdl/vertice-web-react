import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { usePathname } from "@storybook/nextjs-vite/navigation.mock";
import { expect, fn, waitFor, within } from "storybook/test";
import { AdminShell } from "./AdminShell";

// The session hook posts renew on clicks and reads the session at expiry: answer both, far ahead.
const later = () => new Date(Date.now() + 25 * 60_000).toISOString();
const shellFetch = fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url === "/api/admin/auth/renew") {
    return Response.json({ renewed: false, expiresAt: later(), sessionEndsAt: later() });
  }
  return Response.json({ expiresAt: later(), sessionEndsAt: later() });
});

const meta = {
  component: AdminShell,
  args: {
    me: { name: "Carla Mendes", email: "carla@vertice.fit" },
    times: { expiresAt: "2099-01-01T00:00:00Z", sessionEndsAt: "2099-01-01T00:00:00Z" },
    children: (
      <main className="p-[var(--space-8)]">
        <h1 className="font-heading text-[length:var(--text-2xl)] font-bold">Dashboard</h1>
      </main>
    ),
  },
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  beforeEach: () => {
    usePathname.mockReturnValue("/painel");
    const original = window.fetch;
    shellFetch.mockClear();
    window.fetch = shellFetch as typeof fetch;
    return () => {
      window.fetch = original;
    };
  },
} satisfies Meta<typeof AdminShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The page inside the shell. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  },
};

const phone = { viewport: { value: "mobile1", isRotated: false } };

/** On a computer: the side navigation, with the current section marked. */
export const Desktop: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    await expect(canvas.getByRole("button", { name: "Sair" })).toBeVisible();
  },
};

/** `jJXT5`: the phone menu opens over a backdrop and closes on Escape. */
export const PhoneMenu: Story = {
  globals: phone,
  play: async ({ canvas, userEvent }) => {
    const open = canvas.getByRole("button", { name: "Abrir menu" });
    await userEvent.click(open);
    const body = within(document.body);
    const menu = await body.findByRole("dialog", { name: "Menu do painel" });
    await expect(within(menu).getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    await expect(within(menu).getByText("carla@vertice.fit")).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("dialog", { name: "Menu do painel" })).toBeNull());
  },
};

/** "Alterar senha" from the account block opens the change-password dialog (R16a). */
export const ChangePassword: Story = {
  globals: phone,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Abrir menu" }));
    const body = within(document.body);
    await userEvent.click(await body.findByRole("button", { name: "Alterar senha" }));
    await expect(await body.findByLabelText("Senha atual")).toBeVisible();
    await expect(body.queryByRole("dialog", { name: "Menu do painel" })).toBeNull();
  },
};

/** A click is a real interaction: the shell posts renew (the server decides whether to call the BFF). */
export const RenewsOnInteraction: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("heading", { name: "Dashboard" }));
    await waitFor(() =>
      expect(shellFetch.mock.calls.some(([url]) => String(url) === "/api/admin/auth/renew")).toBe(true),
    );
  },
};
