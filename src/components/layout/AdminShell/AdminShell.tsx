"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { KeyRound, Menu, X } from "lucide-react";
import { ChangePasswordDialog } from "@/components/domain/ChangePasswordDialog";
import { initialsOf, SideNav, ToastProvider } from "@/components/ui";
import type { SessionTimes } from "@/lib/adminAuth/renewal";
import { signOutAdmin } from "@/lib/adminAuth/signOut";
import { AdminChip } from "../AdminChip";
import { activeAdminSection, ADMIN_NAV } from "./nav";
import { useAdminSession } from "./useAdminSession";

interface AdminShellProps {
  /** The signed-in admin, from the layout's server-side `GET /auth/me`. */
  me: { name: string; email: string };
  /** The token's times from the layout (`adminTokenTimes`), to arm the sign-out timer. */
  times?: SessionTimes;
  children: React.ReactNode;
}

function Brand() {
  return (
    <>
      <Image src="/logo-mark.png" alt="" width={28} height={28} />
      <span className="font-heading text-[length:var(--text-lg)] font-semibold text-[color:var(--color-text-primary)]">
        Vertice
      </span>
      <AdminChip />
    </>
  );
}

/**
 * The admin workspace's frame (pen.dev `izLYp`, `qzCk9`, `jJXT5`; admin-panel spec §5, §7): the side
 * navigation on a computer, a top bar with a menu drawer on a phone, the toasts, the session's
 * renewal and sign-out (`useAdminSession`), and the account's "Alterar senha" (R16a) and "Sair".
 * Rendered only by the `(admin)` layout, after its server-side role check.
 */
export function AdminShell({ me, times, children }: AdminShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  useAdminSession(times);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const nav = (variant: "rail" | "drawer") => (
    <SideNav
      brand={<Brand />}
      items={ADMIN_NAV}
      activeHref={activeAdminSection(pathname)}
      account={me}
      accountActions={[
        {
          label: "Alterar senha",
          icon: KeyRound,
          onClick: () => {
            setMenuOpen(false);
            setChangingPassword(true);
          },
        },
      ]}
      onSignOut={() => signOutAdmin()}
      variant={variant}
      onNavigate={() => setMenuOpen(false)}
    />
  );

  return (
    <ToastProvider>
      <div className="flex min-h-screen w-full bg-[var(--color-bg)]">
        <div className="sticky top-0 hidden h-screen shrink-0 md:block">{nav("rail")}</div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[var(--color-border)] px-[16px] py-[12px] md:hidden">
            <div className="flex items-center gap-[12px]">
              <button
                type="button"
                aria-label="Abrir menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
                className="flex h-[40px] w-[40px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-strong)] text-[color:var(--color-text-primary)]"
              >
                <Menu aria-hidden="true" className="h-[20px] w-[20px]" />
              </button>
              <div className="flex items-center gap-[8px]">
                <Brand />
              </div>
            </div>
            <span
              aria-hidden="true"
              className="flex h-[32px] w-[32px] items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-secondary)] text-[11px] font-bold text-[#F2F6FA]"
            >
              {initialsOf(me.name)}
            </span>
          </header>
          <div className="flex w-full flex-1 flex-col">{children}</div>
        </div>
      </div>

      {menuOpen && (
        <div role="dialog" aria-modal="true" aria-label="Menu do painel" className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            tabIndex={-1}
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-[#000000A6]"
          />
          <div className="relative h-full w-[290px]">{nav("drawer")}</div>
          <button
            type="button"
            aria-label="Fechar menu"
            autoFocus
            onClick={() => setMenuOpen(false)}
            className="absolute top-[16px] left-[302px] flex h-[40px] w-[40px] items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface)] text-[color:var(--color-text-primary)]"
          >
            <X aria-hidden="true" className="h-[20px] w-[20px]" />
          </button>
        </div>
      )}

      {changingPassword && (
        <ChangePasswordDialog
          onClose={() => setChangingPassword(false)}
          // E42: every session of the account ended, this one too. Sign in again.
          onChanged={() => signOutAdmin("senha-alterada")}
        />
      )}
    </ToastProvider>
  );
}
