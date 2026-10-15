import { AppHeader } from "@/components/layout/AppHeader";
import { LegalFooter } from "@/components/layout/LegalFooter";
import { TermsConsentGate } from "@/components/layout/TermsConsentGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--color-bg)]">
      <AppHeader />
      <main className="flex w-full flex-1 flex-col">
        <TermsConsentGate>{children}</TermsConsentGate>
      </main>
      <LegalFooter className="border-t border-[var(--color-border)] py-[var(--space-4)]" />
    </div>
  );
}
