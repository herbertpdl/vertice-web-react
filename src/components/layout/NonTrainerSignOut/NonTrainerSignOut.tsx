"use client";

import { useEffect, useRef } from "react";
import { PageLoadingOverlay } from "@/components/ui";
import { APP_ONLY_LOGIN_PATH } from "@/lib/auth/trainerOnly";
import { useSignOut } from "@/lib/auth/useSignOut";

/**
 * What the trainer layout renders, instead of any app markup, when the server's `GET /auth/me`
 * says the session isn't a trainer's (admin-panel spec W4; web-trainer-only-access R7): the
 * cookie is cleared and the login shows the "use the app" message. A server layout can't clear
 * the httpOnly cookie, and a 404 would strand it (the proxy bounces `/login` back while it exists).
 */
export function NonTrainerSignOut() {
  const leave = useSignOut(APP_ONLY_LOGIN_PATH);
  const leaving = useRef(false);
  useEffect(() => {
    if (leaving.current) return;
    leaving.current = true;
    leave().catch(() => {
      // A failed sign-out (network): a reload tries again.
      leaving.current = false;
    });
  }, [leave]);

  return (
    <div className="relative flex min-h-screen w-full">
      <PageLoadingOverlay text="Carregando..." />
    </div>
  );
}
