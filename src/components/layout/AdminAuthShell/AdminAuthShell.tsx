import Image from "next/image";
import { Lock } from "lucide-react";
import { AdminChip } from "../AdminChip";

interface AdminAuthShellProps {
  /** The admin hostname shown under the brand panel ("admin.vertice.fit"). */
  host?: string;
  children: React.ReactNode;
}

/**
 * The admin sign-in's frame (pen.dev `xtHYu` and the rest of the Acesso row `FnC0Y`): a brand
 * panel with "PAINEL ADMINISTRATIVO." and the restricted-access line, and the form column. No legal
 * footer: the legal pages live on www only, and the admin host 404s them.
 */
export function AdminAuthShell({ host, children }: AdminAuthShellProps) {
  return (
    <div className="flex min-h-screen w-full shrink-0 bg-[var(--color-bg)]">
      <div className="font-base hidden h-screen w-[560px] shrink-0 flex-col justify-between overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-12)] lg:sticky lg:top-0 lg:flex">
        <div className="flex items-center gap-[var(--space-3)]">
          <Image src="/logo-mark.png" alt="" width={34} height={34} priority />
          <span className="font-heading text-[length:var(--text-lg)] font-semibold tracking-[3px] text-[color:var(--color-text-primary)]">
            VERTICE
          </span>
          <AdminChip />
        </div>

        <div className="flex w-full flex-col">
          <span className="font-heading text-[60px] leading-[1.02] font-bold text-[color:var(--color-text-primary)]">
            PAINEL
          </span>
          <span className="font-heading text-[60px] leading-[1.02] font-bold text-[color:var(--color-primary)]">
            ADMINISTRATIVO.
          </span>
        </div>

        <div className="flex flex-col gap-[8px]">
          {host && (
            <span className="flex items-center gap-[6px] text-[12px] text-[color:var(--color-text-tertiary)]">
              <Lock aria-hidden="true" className="h-[14px] w-[14px]" />
              {host}
            </span>
          )}
          <p className="max-w-[420px] text-[13px] leading-[1.5] text-[color:var(--color-text-secondary)]">
            Acesso restrito à equipe Vertice. Toda ação feita aqui fica registrada no histórico.
          </p>
        </div>
      </div>
      <div className="flex w-full flex-1 flex-col items-center justify-center p-[var(--space-6)] sm:p-[var(--space-12)]">
        {children}
      </div>
    </div>
  );
}
