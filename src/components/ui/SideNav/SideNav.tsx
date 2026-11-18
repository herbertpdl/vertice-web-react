import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { LogOut } from "lucide-react";

export interface SideNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface SideNavAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface SideNavProps {
  /** The logo group at the top. */
  brand: React.ReactNode;
  items: SideNavItem[];
  /** The `href` of the current section, or `undefined` for none. */
  activeHref?: string;
  account: { name: string; email: string };
  /** Account entries above "Sair" (e.g. "Alterar senha"). */
  accountActions?: SideNavAction[];
  onSignOut: () => void;
  /** `rail`: the desktop column on the page background. `drawer`: the phone menu, on the surface. */
  variant?: "rail" | "drawer";
  /** Called when a link is followed (the phone drawer closes). */
  onNavigate?: () => void;
  className?: string;
}

/** Up to two initials: the first letters of the first and last words. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

const itemBase =
  "flex w-full items-center gap-[10px] rounded-[var(--radius-md)] px-[12px] py-[10px] text-left text-[length:var(--text-base)] transition-colors";

/**
 * The admin side navigation (pen.dev Admin Sidebar `izLYp`; the phone drawer in `jJXT5`): logo,
 * the section links, and an account block with the admin's name and e-mail, account actions and
 * "Sair".
 */
export function SideNav({
  brand,
  items,
  activeHref,
  account,
  accountActions = [],
  onSignOut,
  variant = "rail",
  onNavigate,
  className = "",
}: SideNavProps) {
  return (
    <nav
      aria-label="Navegação do painel"
      className={`font-base flex h-full flex-col justify-between px-[16px] py-[24px] ${
        variant === "rail"
          ? "w-[248px] border-r border-[var(--color-border)] bg-[var(--color-bg)]"
          : "w-[290px] bg-[var(--color-surface)]"
      } ${className}`}
    >
      <div className="flex w-full flex-col gap-[32px]">
        <div className="flex items-center gap-[8px] px-[8px]">{brand}</div>
        <ul className="flex w-full flex-col gap-[4px]">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === activeHref;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                  className={`${itemBase} ${
                    active
                      ? "bg-[var(--color-surface-hover)] font-semibold text-[color:var(--color-text-primary)]"
                      : "text-[color:var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[color:var(--color-text-primary)]"
                  }`}
                >
                  <Icon
                    aria-hidden="true"
                    className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[color:var(--color-primary)]" : ""}`}
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex w-full flex-col gap-[8px] border-t border-[var(--color-border)] pt-[16px]">
        <div className="flex w-full items-center gap-[10px] px-[8px] py-[6px]">
          <span
            aria-hidden="true"
            className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-secondary)] text-[12px] font-bold text-[#F2F6FA]"
          >
            {initialsOf(account.name)}
          </span>
          <div className="flex min-w-0 flex-col gap-[1px]">
            <span className="truncate text-[13px] font-semibold text-[color:var(--color-text-primary)]">
              {account.name}
            </span>
            <span className="truncate text-[11px] text-[color:var(--color-text-tertiary)]">{account.email}</span>
          </div>
        </div>
        {accountActions.map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className={`${itemBase} text-[color:var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[color:var(--color-text-primary)]`}
          >
            <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={onSignOut}
          className={`${itemBase} text-[color:var(--color-danger)] hover:bg-[var(--color-surface-hover)]`}
        >
          <LogOut aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
          Sair
        </button>
      </div>
    </nav>
  );
}
