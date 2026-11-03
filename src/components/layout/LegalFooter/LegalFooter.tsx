import Link from "next/link";

interface LegalFooterProps {
  className?: string;
}

const linkClass =
  "whitespace-nowrap text-[length:var(--text-xs)] text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-primary)]";

/**
 * Links to the legal texts (P1-04) and the support page, at the foot of the auth screens and of the
 * app shell. On a phone the row can wrap, so the separators show from `sm` up only.
 */
export function LegalFooter({ className = "" }: LegalFooterProps) {
  return (
    <footer className={`font-base flex flex-wrap items-center justify-center gap-x-[var(--space-4)] gap-y-[var(--space-2)] ${className}`}>
      <Link href="/termos" className={linkClass}>
        Termos de Uso
      </Link>
      <span aria-hidden="true" className="hidden text-[length:var(--text-xs)] sm:inline text-[color:var(--color-text-tertiary)]">
        ·
      </span>
      <Link href="/privacidade" className={linkClass}>
        Política de Privacidade
      </Link>
      <span aria-hidden="true" className="hidden text-[length:var(--text-xs)] sm:inline text-[color:var(--color-text-tertiary)]">
        ·
      </span>
      <Link href="/suporte" className={linkClass}>
        Suporte
      </Link>
    </footer>
  );
}
