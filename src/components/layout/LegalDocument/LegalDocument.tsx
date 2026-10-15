import { AuthScreenShell } from "../AuthScreenShell";

interface LegalDocumentProps {
  title: string;
  version: string;
  date: string;
  children: React.ReactNode;
}

/**
 * The public legal pages (`/termos`, `/privacidade`): the auth screens' shell, a draft banner, the
 * text's version and date, then the sections (`LegalSection`).
 */
export function LegalDocument({ title, version, date, children }: LegalDocumentProps) {
  return (
    <AuthScreenShell
      lines={["TREINE.", "ACOMPANHE.", "EVOLUA."]}
      footerText="Como a Vertice trata os seus dados e os dos seus alunos."
    >
      <article className="flex w-full max-w-[680px] flex-col gap-[var(--space-6)]">
        <div
          role="note"
          className="rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning)]/10 px-[14px] py-[10px] text-[length:var(--text-sm)] font-semibold text-[color:var(--color-warning)]"
        >
          Rascunho — sujeito a revisão jurídica.
        </div>

        <header className="flex flex-col gap-[6px]">
          <h1 className="font-heading text-[length:var(--text-2xl)] font-bold text-[color:var(--color-text-primary)]">
            {title}
          </h1>
          <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
            Versão {version} · {date}
          </p>
        </header>

        <div className="flex flex-col gap-[var(--space-6)]">{children}</div>
      </article>
    </AuthScreenShell>
  );
}

interface LegalSectionProps {
  title: string;
  children: React.ReactNode;
}

/** One numbered heading of a legal text. Paragraphs and lists inside get the body typography. */
export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="flex flex-col gap-[var(--space-2)]">
      <h2 className="font-heading text-[length:var(--text-lg)] font-semibold text-[color:var(--color-text-primary)]">
        {title}
      </h2>
      <div className="flex flex-col gap-[var(--space-2)] text-[length:var(--text-sm)] leading-[1.6] text-[color:var(--color-text-secondary)] [&_li]:ml-[var(--space-5)] [&_li]:list-disc [&_strong]:text-[color:var(--color-text-primary)]">
        {children}
      </div>
    </section>
  );
}
