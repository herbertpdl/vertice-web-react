"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TermsConsentError } from "@/components/domain/TermsConsentError";
import { TermsConsentNotice } from "@/components/domain/TermsConsentNotice";
import { PageLoadingOverlay } from "@/components/ui";
import { recordConsent } from "@/lib/api/auth";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import type { Me } from "@/lib/api/types";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useSignOut } from "@/lib/auth/useSignOut";
import { APP_ONLY_LOGIN_PATH, isTrainer } from "@/lib/auth/trainerOnly";
import { useLegalVersionsDriftWarning } from "@/lib/legal/useLegalVersionsDriftWarning";
import { LEGAL_VERSIONS, needsTermsAcceptance } from "@/lib/legal/versions";

interface TermsConsentGateProps {
  children: React.ReactNode;
  /** Injected by stories; defaults to the BFF call. */
  api?: { recordConsent: typeof recordConsent };
}

/**
 * Renders the app's pages only for a trainer (web-trainer-only-access R6, R7) who has accepted the
 * current Terms / Privacy Policy (`GET /auth/me`'s `consent.termsVersion`). Any other role is
 * signed out and sent to the login with the "use the app" message, and never sees a page. Until
 * the Terms are accepted the page is replaced by `TermsConsentNotice`; the header (with "Sair")
 * stays. Users registered before P1-04 and everyone after a version bump land there once.
 */
export function TermsConsentGate({ children, api = { recordConsent } }: TermsConsentGateProps) {
  const queryClient = useQueryClient();
  const { data: me, isError, isFetching, refetch } = useCurrentUser();
  const signOut = useSignOut();
  const leaveForTheApp = useSignOut(APP_ONLY_LOGIN_PATH);
  const version = LEGAL_VERSIONS.terms;
  useLegalVersionsDriftWarning();

  // A client's or admin's session (one from before the login refused them, or a cookie set by
  // hand) is signed out once, as soon as `me` says who it is.
  const nonTrainer = me != null && !isTrainer(me.role);
  const leaving = useRef(false);
  useEffect(() => {
    if (nonTrainer && !leaving.current) {
      leaving.current = true;
      // A failed sign-out (network) is tried again on the next render instead of hanging here.
      leaveForTheApp().catch(() => {
        leaving.current = false;
      });
    }
  }, [nonTrainer, leaveForTheApp]);

  const accept = useMutation({
    mutationFn: () => api.recordConsent({ type: "TERMS", version }),
    // The response is the caller's new consent state: put it in `me` rather than refetching, so
    // the page appears as soon as the BFF has recorded it.
    onSuccess: (consent) => {
      queryClient.setQueryData<Me>(["me"], (current) => current && { ...current, consent });
    },
  });

  // Fails closed: the page renders only once `me` says the current version was accepted. The
  // decision reads `me`'s data, never the error flag: after a failed background refetch react-query
  // keeps the last data (and sets `isError`), and that data still decides.
  if (!me || nonTrainer) {
    // A 401 already logs out (apiClient); any other failure leaves the page hidden until a retry
    // (while retrying, the query stays in `error` with `isFetching`).
    if (!isError || nonTrainer) {
      return (
        <div className="relative flex w-full flex-1">
          <PageLoadingOverlay text="Carregando..." />
        </div>
      );
    }
    return (
      <div className="flex w-full flex-1 items-start justify-center p-[var(--space-10)]">
        <TermsConsentError retrying={isFetching} onRetry={() => void refetch()} onSignOut={signOut} />
      </div>
    );
  }

  if (!needsTermsAcceptance(me.consent, version)) return children;

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
