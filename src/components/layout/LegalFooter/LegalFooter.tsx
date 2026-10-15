import Link from "next/link";

interface LegalFooterProps {
  className?: string;
}

const linkClass =
  "text-[length:var(--text-xs)] text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-primary)]";

/** Links to the legal texts (P1-04), at the foot of the auth screens and of the app shell. */
export function LegalFooter({ className = "" }: LegalFooterProps) {
  return (
    <footer className={`font-base flex items-center justify-center gap-[var(--space-4)] ${className}`}>
      <Link href="/termos" className={linkClass}>
        Termos de Uso
      </Link>
      <span aria-hidden="true" className="text-[length:var(--text-xs)] text-[color:var(--color-text-tertiary)]">
        ·
      </span>
      <Link href="/privacidade" className={linkClass}>
        Política de Privacidade
      </Link>
    </footer>
  );
}
