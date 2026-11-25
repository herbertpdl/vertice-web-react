"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { guardedLinkPath } from "./leaveGuard";

export interface LeaveGuard {
  /** Runs `action` now when nothing would be lost, otherwise once the trainer confirms. */
  confirmLeave: (action: () => void) => void;
  /** A leave is waiting for the trainer's answer: render the dialog. */
  asking: boolean;
  /** "Continuar editando". */
  stay: () => void;
  /** "Sair sem salvar": runs the waiting leave. */
  leave: () => void;
}

/**
 * Warns before unsaved changes are lost (client-anamnese spec D6, R15, E3, E24). While `when`:
 * reload and close get the browser's own prompt (`beforeunload`); in-app link clicks are caught in
 * the capture phase (before `Link` handles them, which skips its navigation once the default is
 * prevented) and wait for the dialog; other exits call `confirmLeave`. The App Router has no
 * route-change event to veto, so `router.push` from elsewhere (the profile menu's "Sair") and
 * browser back/forward are not covered: accepted gaps (owner decision, assessment Q4).
 */
export function useLeaveGuard(when: boolean): LeaveGuard {
  const router = useRouter();
  const [pending, setPending] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      const path = guardedLinkPath(
        event,
        anchor instanceof HTMLAnchorElement
          ? { href: anchor.href, target: anchor.target, hasDownload: anchor.hasAttribute("download") }
          : null,
        new URL(window.location.href),
      );
      if (path === null) return;
      event.preventDefault();
      setPending(() => () => router.push(path));
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [when, router]);

  return {
    confirmLeave: (action) => {
      if (when) setPending(() => action);
      else action();
    },
    asking: pending !== null,
    stay: () => setPending(null),
    leave: () => {
      const action = pending;
      setPending(null);
      action?.();
    },
  };
}
