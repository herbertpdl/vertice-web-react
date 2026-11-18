import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Dumbbell, History, KeyRound, LayoutDashboard, Users } from "lucide-react";
import { expect, fn } from "storybook/test";
import { SideNav } from "./SideNav";

const items = [
  { href: "/painel", label: "Dashboard", icon: LayoutDashboard },
  { href: "/painel/usuarios", label: "Usuários", icon: Users },
  { href: "/painel/exercicios", label: "Exercícios", icon: Dumbbell },
  { href: "/painel/historico", label: "Histórico", icon: History },
];

const meta = {
  component: SideNav,
  args: {
    brand: <span className="font-heading text-[length:var(--text-lg)] font-semibold">Vertice</span>,
    items,
    activeHref: "/painel",
    account: { name: "Carla Mendes", email: "carla@vertice.fit" },
    accountActions: [{ label: "Alterar senha", icon: KeyRound, onClick: fn() }],
    onSignOut: fn(),
  },
  decorators: [
    (Story) => (
      <div className="h-[900px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SideNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DashboardActive: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    await expect(canvas.getByRole("link", { name: "Usuários" })).not.toHaveAttribute("aria-current");
    await expect(canvas.getByText("CM")).toBeVisible();
  },
};

export const UsersActive: Story = { args: { activeHref: "/painel/usuarios" } };

export const ExercisesActive: Story = { args: { activeHref: "/painel/exercicios" } };

export const HistoryActive: Story = { args: { activeHref: "/painel/historico" } };

/** The phone menu (`jJXT5`), on the surface color. */
export const Drawer: Story = { args: { variant: "drawer", activeHref: "/painel/usuarios" } };

/** The account block's actions and "Sair". */
export const AccountActions: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Alterar senha" }));
    await expect(args.accountActions![0].onClick).toHaveBeenCalled();
    await userEvent.click(canvas.getByRole("button", { name: "Sair" }));
    await expect(args.onSignOut).toHaveBeenCalled();
  },
};
