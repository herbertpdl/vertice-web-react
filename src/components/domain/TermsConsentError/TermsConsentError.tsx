import { Button } from "@/components/ui";

interface TermsConsentErrorProps {
  retrying: boolean;
  onRetry: () => void;
  onSignOut: () => void;
}

/**
 * Shown in place of the page when the consent state couldn't be loaded (`GET /auth/me` failed
 * with no earlier answer to fall back on). The consent gate fails closed: no page until it knows.
 */
export function TermsConsentError({ retrying, onRetry, onSignOut }: TermsConsentErrorProps) {
  return (
    <section
      aria-labelledby="terms-consent-error-title"
      className="font-base flex w-full max-w-[520px] flex-col gap-[var(--space-5)] rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-[var(--space-6)]"
    >
      <h2
        id="terms-consent-error-title"
        className="font-heading text-[length:var(--text-lg)] font-semibold text-[color:var(--color-text-primary)]"
      >
        Não foi possível carregar sua conta
      </h2>
      <p
        role="alert"
        className="text-[length:var(--text-sm)] leading-[1.5] text-[color:var(--color-text-secondary)]"
      >
        Verifique sua conexão e tente novamente em instantes.
      </p>
      <div className="flex w-full items-center justify-end gap-[var(--space-3)]">
        <Button variant="outline" onClick={onSignOut} disabled={retrying}>
          Sair
        </Button>
        <Button onClick={onRetry} loading={retrying}>
          Tentar novamente
        </Button>
      </div>
    </section>
  );
}
