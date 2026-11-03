import type { Metadata } from "next";
import { AuthScreenShell } from "@/components/layout/AuthScreenShell";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = { title: "Suporte — Vertice" };

/**
 * The support page the App Store and Google Play listings link to (their "Support URL"). E-mail is
 * the only support channel for now.
 */
export default function SupportPage() {
  return (
    <AuthScreenShell
      lines={["TREINE.", "ACOMPANHE.", "EVOLUA."]}
      footerText="Fale com a equipe da Vertice."
    >
      <article className="flex w-full max-w-[680px] flex-col gap-[var(--space-6)]">
        <header className="flex flex-col gap-[6px]">
          <h1 className="font-heading text-[length:var(--text-2xl)] font-bold text-[color:var(--color-text-primary)]">
            Suporte
          </h1>
          <p className="text-[length:var(--text-sm)] leading-[1.6] text-[color:var(--color-text-secondary)]">
            Dúvidas, problemas com o app ou com a sua conta? Escreva para a gente:
          </p>
        </header>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="font-heading text-[length:var(--text-lg)] font-semibold text-[color:var(--color-primary)]"
        >
          {SUPPORT_EMAIL}
        </a>
      </article>
    </AuthScreenShell>
  );
}
