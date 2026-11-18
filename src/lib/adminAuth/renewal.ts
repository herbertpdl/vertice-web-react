// The admin session's renewal and sign-out in the browser (admin-panel spec W8, §5), as a
// controller with every side effect injected, so the rules are unit-tested with fake time:
//
// - Renewal comes only from the admin's own interactions (`interaction()`), at most once per
//   `RENEW_THROTTLE_MS` per tab, and only while the page is visible. Nothing here renews on a
//   timer: the one timer signs out.
// - The sign-out timer fires at `min(expiresAt, sessionEndsAt)` plus a second. Before signing
//   out it reads the current cookie's times (`readSession`, no BFF call, not a renewal): another
//   tab sharing the cookie may have renewed it, in which case it re-arms instead.
// - A renewal's times are shared with the other tabs (`broadcast`), which re-arm from them.

export interface SessionTimes {
  /** The token's own expiry (30 minutes after it was issued, never after `sessionEndsAt`). */
  expiresAt: string;
  /** The sign-in's hard cap (12 hours); renewal never moves it. */
  sessionEndsAt: string;
}

/** At most one renewal attempt per tab per minute (W8). */
export const RENEW_THROTTLE_MS = 60_000;

/** The sign-out check runs this long after the expiry, so the cookie is surely past it. */
export const SIGN_OUT_GRACE_MS = 1_000;

export type RenewResult =
  | { kind: "ok"; renewed: boolean; times: SessionTimes }
  /** 401: the session is over (suspended, re-roled, a changed password, expired). */
  | { kind: "unauthorized" }
  /** A network error, a 429 or a 5xx: nothing changes; the sign-out timer still holds. */
  | { kind: "failed" };

export type SessionReadResult =
  | { kind: "ok"; times: SessionTimes }
  | { kind: "unauthorized" }
  | { kind: "failed" };

export interface SessionControllerDeps {
  now: () => number;
  setTimer: (callback: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
  isVisible: () => boolean;
  renew: () => Promise<RenewResult>;
  readSession: () => Promise<SessionReadResult>;
  signOut: () => void;
  broadcast: (times: SessionTimes) => void;
}

/** When the session ends: the earlier of the token's expiry and the 12-hour cap. */
export function sessionEnd(times: SessionTimes): number {
  return Math.min(Date.parse(times.expiresAt), Date.parse(times.sessionEndsAt));
}

/** Milliseconds from `now` until the sign-out check for `times`. */
export function signOutDelay(times: SessionTimes, now: number): number {
  const end = sessionEnd(times);
  return Number.isNaN(end) ? 0 : Math.max(0, end + SIGN_OUT_GRACE_MS - now);
}

export interface SessionController {
  /** Arms the sign-out timer from the initial times (or checks at once without them). */
  start: () => void;
  /** A real interaction: a pointer or key press, a route change, a mutation starting. */
  interaction: () => void;
  /** The page became visible: background tabs throttle timers, so check now. */
  becameVisible: () => void;
  /** Times another tab got from a renewal. */
  adopt: (times: SessionTimes) => void;
  /** Stops the timer without signing out (unmount). */
  dispose: () => void;
}

export function createSessionController(
  initial: SessionTimes | undefined,
  deps: SessionControllerDeps,
): SessionController {
  let times = initial;
  let timer: unknown;
  let lastAttempt: number | undefined;
  let stopped = false;
  let checking = false;

  function clear() {
    if (timer !== undefined) deps.clearTimer(timer);
    timer = undefined;
  }

  function end() {
    if (stopped) return;
    stopped = true;
    clear();
    deps.signOut();
  }

  function arm(next: SessionTimes) {
    if (stopped) return;
    times = next;
    clear();
    timer = deps.setTimer(() => void check(), signOutDelay(next, deps.now()));
  }

  /** Reads the cookie's times: re-arms while they are ahead, signs out otherwise. Never renews. */
  async function check() {
    if (stopped || checking) return;
    checking = true;
    try {
      const result = await deps.readSession();
      if (stopped) return;
      const now = deps.now();
      if (result.kind === "ok" && sessionEnd(result.times) > now) arm(result.times);
      // A failed read (network) while the known times are still ahead: try again at their end.
      else if (result.kind === "failed" && times && sessionEnd(times) > now) arm(times);
      // Past the end, or a 401: the token is never held past its expiry.
      else end();
    } finally {
      checking = false;
    }
  }

  async function renew() {
    const result = await deps.renew();
    if (stopped) return;
    if (result.kind === "unauthorized") end();
    else if (result.kind === "ok") {
      arm(result.times);
      if (result.renewed) deps.broadcast(result.times);
    }
  }

  return {
    start() {
      if (times) arm(times);
      else void check();
    },
    interaction() {
      if (stopped || !deps.isVisible()) return;
      const now = deps.now();
      // Past the end there is nothing to renew: the check signs out.
      if (times && sessionEnd(times) <= now) {
        void check();
        return;
      }
      if (lastAttempt !== undefined && now - lastAttempt < RENEW_THROTTLE_MS) return;
      lastAttempt = now;
      void renew();
    },
    becameVisible() {
      void check();
    },
    adopt(next) {
      if (!times || sessionEnd(next) > sessionEnd(times)) arm(next);
    },
    dispose() {
      stopped = true;
      clear();
    },
  };
}
