"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TermsConsentNotice } from "@/components/domain/TermsConsentNotice";
import { PageLoadingOverlay } from "@/components/ui";
import { recordConsent } from "@/lib/api/auth";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import type { Me } from "@/lib/api/types";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useSignOut } from "@/lib/auth/useSignOut";
import { LEGAL_VERSIONS, needsTermsAcceptance } from "@/lib/legal/versions";

interface TermsConsentGateProps {
  children: React.ReactNode;
  /** Injected by stories; defaults to the BFF call. */
  api?: { recordConsent: typeof recordConsent };
}

/**
 * Renders the app's pages only once the user has accepted the current Terms / Privacy Policy
 * (`GET /auth/me`'s `consent.termsVersion`). Until then the page is replaced by
 * `TermsConsentNotice`; the header (with "Sair") stays. Users registered before P1-04, clients
 * created by their trainer, and everyone after a version bump land here once.
 */
export function TermsConsentGate({ children, api = { recordConsent } }: TermsConsentGateProps) {
  const queryClient = useQueryClient();
  const { data: me, isPending, isError } = useCurrentUser();
  const signOut = useSignOut();
  const version = LEGAL_VERSIONS.terms;

  const accept = useMutation({
    mutationFn: () => api.recordConsent({ type: "TERMS", version }),
    // The response is the caller's new consent state: put it in `me` rather than refetching, so
    // the page appears as soon as the BFF has recorded it.
    onSuccess: (consent) => {
      queryClient.setQueryData<Me>(["me"], (current) => current && { ...current, consent });
    },
  });

  if (isPending) {
    return (
      <div className="relative flex w-full flex-1">
        <PageLoadingOverlay text="Carregando..." />
      </div>
    );
  }

  // `GET /auth/me` failed for another reason than 401 (that one logs out, see apiClient): the BFF
  // is unreachable, so every page's own calls fail too and show their errors. Nothing to gate.
  if (isError || !needsTermsAcceptance(me.consent, version)) return children;

  return (
    <div className="flex w-full flex-1 items-start justify-center p-[var(--space-10)]">
      <TermsConsentNotice
        version={version}
        updated={me.consent?.termsVersion != null}
        accepting={accept.isPending}
        error={
          accept.isError
            ? apiErrorMessage(accept.error, "Não foi possível registrar o aceite. Tente novamente.")
            : null
        }
        onAccept={() => accept.mutate()}
        onSignOut={signOut}
      />
    </div>
  );
}
