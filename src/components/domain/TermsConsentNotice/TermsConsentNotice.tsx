import Link from "next/link";
import { Button } from "@/components/ui";

interface TermsConsentNoticeProps {
  /** The Terms / Privacy Policy version being asked for. */
  version: string;
  /** The user accepted an earlier version: say the texts changed rather than "first access". */
  updated: boolean;
  accepting: boolean;
  error: string | null;
  onAccept: () => void;
  onSignOut: () => void;
}

const linkClass = "font-semibold text-[color:var(--color-primary)]";

/**
 * The blocking first-access notice (P1-04): shown in place of the page until the user accepts
 * the current Terms of Use / Privacy Policy. The only other way out is "Sair".
 */
export function TermsConsentNotice({
  version,
  updated,
  accepting,
  error,
  onAccept,
  onSignOut,
}: TermsConsentNoticeProps) {
  return (
    <section
      aria-labelledby="terms-consent-title"
      className="font-base flex w-full max-w-[520px] flex-col gap-[var(--space-5)] rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-[var(--space-6)]"
    >
      <h2
        id="terms-consent-title"
        className="font-heading text-[length:var(--text-lg)] font-semibold text-[color:var(--color-text-primary)]"
      >
        {updated ? "Atualizamos nossos termos" : "Antes de continuar"}
      </h2>

      <div className="flex flex-col gap-[var(--space-3)] text-[length:var(--text-sm)] leading-[1.5] text-[color:var(--color-text-secondary)]">
        <p>
          {updated
            ? "Os Termos de Uso e a Política de Privacidade mudaram desde o seu último aceite."
            : "Para usar a Vertice, é preciso aceitar os Termos de Uso e a Política de Privacidade."}{" "}
          Leia os{" "}
          <Link href="/termos" target="_blank" rel="noopener noreferrer" className={linkClass}>
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" target="_blank" rel="noopener noreferrer" className={linkClass}>
            Política de Privacidade
          </Link>{" "}
          (versão {version}).
        </p>
        <p>Ao clicar em “Aceitar”, você declara que leu e concorda com os dois textos.</p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-danger)]"
        >
          {error}
        </div>
      )}

      <div className="flex w-full items-center justify-end gap-[var(--space-3)]">
        <Button variant="outline" onClick={onSignOut} disabled={accepting}>
          Sair
        </Button>
        <Button onClick={onAccept} loading={accepting}>
          Aceitar
        </Button>
      </div>
    </section>
  );
}
