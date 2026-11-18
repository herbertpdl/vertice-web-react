import { LayoutDashboard } from "lucide-react";
import type { SideNavItem } from "@/components/ui/SideNav";

/**
 * The admin side navigation's sections, in order. Only sections whose pages exist are listed, so
 * the live panel never links to a 404: VRT-26 adds Usuários (`Users`, `/painel/usuarios`) and
 * Histórico (`History`, `/painel/historico`) after Dashboard; VRT-32 adds Exercícios (`Dumbbell`,
 * `/painel/exercicios`) between them, as in `izLYp`.
 */
export const ADMIN_NAV: SideNavItem[] = [{ href: "/painel", label: "Dashboard", icon: LayoutDashboard }];

/** The section a path belongs to: `/painel` only exactly, any other by prefix. */
export function activeAdminSection(pathname: string, items: SideNavItem[] = ADMIN_NAV): string | undefined {
  return items.find(({ href }) =>
    href === "/painel" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`),
  )?.href;
}
