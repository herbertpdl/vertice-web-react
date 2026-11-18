import { AppHeader } from "@/components/layout/AppHeader";
import { LegalFooter } from "@/components/layout/LegalFooter";
import { NonTrainerSignOut } from "@/components/layout/NonTrainerSignOut";
import { TermsConsentGate } from "@/components/layout/TermsConsentGate";
import { isTrainer } from "@/lib/auth/trainerOnly";
import { fetchMeOnServer } from "@/lib/serverMe";
import { getSessionToken } from "@/lib/session";

/**
 * The trainer workspace. A server-side role check first (admin-panel spec W4, defence in depth):
 * a session whose `GET /auth/me` isn't a trainer's gets no app markup, only its sign-out. A 401, an
 * unreachable BFF or no cookie fall through to the client handling (`TermsConsentGate` and
 * `apiClient`'s 401 path), as before.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const token = await getSessionToken();
  const result = token ? await fetchMeOnServer(token) : undefined;
  if (result?.kind === "ok" && !isTrainer(result.me.role)) return <NonTrainerSignOut />;

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
