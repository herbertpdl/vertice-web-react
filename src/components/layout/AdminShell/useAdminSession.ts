"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  createSessionController,
  type RenewResult,
  type SessionController,
  type SessionReadResult,
  type SessionTimes,
} from "@/lib/adminAuth/renewal";
import { signOutAdmin } from "@/lib/adminAuth/signOut";

/** The channel the tabs of one browser share renewed times on (admin-panel spec §5). */
export const ADMIN_SESSION_CHANNEL = "vertice-admin-session";

async function postRenew(): Promise<RenewResult> {
  try {
    const res = await fetch("/api/admin/auth/renew", { method: "POST" });
    if (res.status === 401) return { kind: "unauthorized" };
    if (!res.ok) return { kind: "failed" };
    const body = (await res.json()) as SessionTimes & { renewed: boolean };
    return {
      kind: "ok",
      renewed: body.renewed,
      times: { expiresAt: body.expiresAt, sessionEndsAt: body.sessionEndsAt },
    };
  } catch {
    return { kind: "failed" };
  }
}

async function readSession(): Promise<SessionReadResult> {
  try {
    const res = await fetch("/api/admin/auth/session", { cache: "no-store" });
    if (res.status === 401) return { kind: "unauthorized" };
    if (!res.ok) return { kind: "failed" };
    const body = (await res.json()) as SessionTimes;
    return { kind: "ok", times: { expiresAt: body.expiresAt, sessionEndsAt: body.sessionEndsAt } };
  } catch {
    return { kind: "failed" };
  }
}

function isTimes(value: unknown): value is SessionTimes {
  const v = value as Partial<SessionTimes> | null;
  return typeof v?.expiresAt === "string" && typeof v.sessionEndsAt === "string";
}

/**
 * Keeps the admin session alive while the admin works, and ends it when it lapses (admin-panel
 * spec W8, §5). Counts only real interactions: `pointerdown` and `keydown` on the document, a route
 * change and the start of a mutation, while the page is visible. Focus, scrolling, pointer moves,
 * query refetches and timers never count. The rules live in `src/lib/adminAuth/renewal.ts`.
 */
export function useAdminSession(initialTimes: SessionTimes | undefined) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const controllerRef = useRef<SessionController | null>(null);
  const lastPathname = useRef(pathname);

  useEffect(() => {
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(ADMIN_SESSION_CHANNEL);
    const controller = createSessionController(initialTimes, {
      now: () => Date.now(),
      setTimer: (callback, ms) => window.setTimeout(callback, ms),
      clearTimer: (handle) => window.clearTimeout(handle as number),
      isVisible: () => document.visibilityState === "visible",
      renew: postRenew,
      readSession,
      signOut: () => signOutAdmin("expirou"),
      broadcast: (times) => channel?.postMessage(times),
    });
    controllerRef.current = controller;
    controller.start();

    const onInteraction = () => controller.interaction();
    const onVisibility = () => {
      if (document.visibilityState === "visible") controller.becameVisible();
    };
    const onMessage = (event: MessageEvent) => {
      if (isTimes(event.data)) controller.adopt(event.data);
    };
    document.addEventListener("pointerdown", onInteraction, { capture: true });
    document.addEventListener("keydown", onInteraction, { capture: true });
    document.addEventListener("visibilitychange", onVisibility);
    channel?.addEventListener("message", onMessage);
    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === "added") controller.interaction();
    });

    return () => {
      controller.dispose();
      controllerRef.current = null;
      document.removeEventListener("pointerdown", onInteraction, { capture: true });
      document.removeEventListener("keydown", onInteraction, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
      channel?.removeEventListener("message", onMessage);
      channel?.close();
      unsubscribe();
    };
    // The initial times seed the controller once; later times come from renewals and other tabs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  // A route change is an interaction (not the first render).
  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    controllerRef.current?.interaction();
  }, [pathname]);
}
