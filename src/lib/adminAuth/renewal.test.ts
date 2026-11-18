import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSessionController,
  RENEW_THROTTLE_MS,
  signOutDelay,
  type RenewResult,
  type SessionReadResult,
  type SessionTimes,
} from "./renewal";

const T0 = Date.parse("2026-11-18T12:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();
const MIN = 60_000;

function times(expiresInMs: number, endsInMs = 12 * 60 * MIN): SessionTimes {
  return { expiresAt: iso(Date.now() + expiresInMs), sessionEndsAt: iso(T0 + endsInMs) };
}

function setup(initial: SessionTimes | null = times(30 * MIN)) {
  let visible = true;
  const deps = {
    now: () => Date.now(),
    setTimer: (callback: () => void, ms: number) => setTimeout(callback, ms),
    clearTimer: (handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    isVisible: () => visible,
    renew: vi.fn<() => Promise<RenewResult>>(async () => ({ kind: "ok", renewed: true, times: times(30 * MIN) })),
    readSession: vi.fn<() => Promise<SessionReadResult>>(async () => ({ kind: "unauthorized" })),
    signOut: vi.fn(),
    broadcast: vi.fn(),
  };
  const controller = createSessionController(initial ?? undefined, deps);
  controller.start();
  return { controller, deps, hide: () => (visible = false), show: () => (visible = true) };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("renewal (admin-panel spec W8)", () => {
  it("never renews without an interaction, however long the tab stays open", async () => {
    const { deps } = setup();
    await vi.advanceTimersByTimeAsync(29 * MIN);
    expect(deps.renew).not.toHaveBeenCalled();
    expect(deps.readSession).not.toHaveBeenCalled();
  });

  it("renews on an interaction, at most once per 60 s per tab", async () => {
    const { controller, deps } = setup();
    controller.interaction();
    controller.interaction();
    await vi.advanceTimersByTimeAsync(RENEW_THROTTLE_MS - 1);
    controller.interaction();
    expect(deps.renew).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    controller.interaction();
    expect(deps.renew).toHaveBeenCalledTimes(2);
  });

  it("ignores interactions while the page is hidden", () => {
    const { controller, deps, hide } = setup();
    hide();
    controller.interaction();
    expect(deps.renew).not.toHaveBeenCalled();
  });

  it("shares a renewal's times with the other tabs, but not a 'too recent' answer", async () => {
    const { controller, deps } = setup();
    controller.interaction();
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.broadcast).toHaveBeenCalledTimes(1);
    deps.renew.mockResolvedValueOnce({ kind: "ok", renewed: false, times: times(20 * MIN) });
    await vi.advanceTimersByTimeAsync(RENEW_THROTTLE_MS);
    controller.interaction();
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.broadcast).toHaveBeenCalledTimes(1);
  });

  it("signs out on a 401 from renew", async () => {
    const { controller, deps } = setup();
    deps.renew.mockResolvedValueOnce({ kind: "unauthorized" });
    controller.interaction();
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.signOut).toHaveBeenCalledTimes(1);
  });

  it("keeps the session on a failed renew (network, 429): the sign-out timer still holds", async () => {
    const { controller, deps } = setup(times(5 * MIN));
    deps.renew.mockResolvedValueOnce({ kind: "failed" });
    controller.interaction();
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.signOut).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5 * MIN + 1000);
    expect(deps.readSession).toHaveBeenCalledTimes(1);
    expect(deps.signOut).toHaveBeenCalledTimes(1);
  });
});

describe("sign-out timer (admin-panel spec W8)", () => {
  it("checks the session one second after expiresAt and signs out on a 401, without renewing", async () => {
    const { deps } = setup(times(30 * MIN));
    await vi.advanceTimersByTimeAsync(30 * MIN);
    expect(deps.readSession).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(deps.readSession).toHaveBeenCalledTimes(1);
    expect(deps.signOut).toHaveBeenCalledTimes(1);
    expect(deps.renew).not.toHaveBeenCalled();
  });

  it("re-arms instead of signing out when another tab renewed the shared cookie", async () => {
    const { deps } = setup(times(30 * MIN));
    deps.readSession.mockResolvedValueOnce({ kind: "ok", times: times(55 * MIN) });
    await vi.advanceTimersByTimeAsync(30 * MIN + 1000);
    expect(deps.signOut).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(25 * MIN);
    expect(deps.readSession).toHaveBeenCalledTimes(2);
    expect(deps.signOut).toHaveBeenCalledTimes(1);
  });

  it("never holds the session past sessionEndsAt, even with a later expiresAt", async () => {
    const { deps } = setup(times(30 * MIN, 10 * MIN));
    await vi.advanceTimersByTimeAsync(10 * MIN + 1000);
    expect(deps.readSession).toHaveBeenCalledTimes(1);
    expect(deps.signOut).toHaveBeenCalledTimes(1);
  });

  it("signs out when the session read shows a past expiry", async () => {
    const { deps } = setup(times(30 * MIN));
    deps.readSession.mockResolvedValueOnce({ kind: "ok", times: times(-1000) });
    await vi.advanceTimersByTimeAsync(30 * MIN + 1000);
    expect(deps.signOut).toHaveBeenCalledTimes(1);
  });

  it("checks at once when the tab becomes visible (background timers are throttled)", async () => {
    const { controller, deps } = setup(times(30 * MIN));
    deps.readSession.mockResolvedValueOnce({ kind: "ok", times: times(30 * MIN) });
    controller.becameVisible();
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.readSession).toHaveBeenCalledTimes(1);
    expect(deps.signOut).not.toHaveBeenCalled();
  });

  it("re-arms from another tab's renewal", async () => {
    const { controller, deps } = setup(times(5 * MIN));
    controller.adopt(times(30 * MIN));
    await vi.advanceTimersByTimeAsync(5 * MIN + 1000);
    expect(deps.readSession).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(25 * MIN);
    expect(deps.readSession).toHaveBeenCalledTimes(1);
  });

  it("an interaction past the end checks (and signs out) instead of renewing", async () => {
    const { controller, deps } = setup(times(1 * MIN));
    // A throttled background timer that hasn't fired yet.
    vi.setSystemTime(T0 + 2 * MIN);
    controller.interaction();
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.renew).not.toHaveBeenCalled();
    expect(deps.signOut).toHaveBeenCalledTimes(1);
  });

  it("checks at once without initial times", async () => {
    const { deps } = setup(null);
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.readSession).toHaveBeenCalledTimes(1);
    expect(deps.signOut).toHaveBeenCalledTimes(1);
  });

  it("signs out once, and does nothing after dispose", async () => {
    const { controller, deps } = setup(times(1 * MIN));
    controller.dispose();
    await vi.advanceTimersByTimeAsync(5 * MIN);
    controller.interaction();
    expect(deps.readSession).not.toHaveBeenCalled();
    expect(deps.renew).not.toHaveBeenCalled();
    expect(deps.signOut).not.toHaveBeenCalled();
  });
});

describe("signOutDelay", () => {
  it("is the earlier end plus a second, never negative", () => {
    expect(signOutDelay({ expiresAt: iso(T0 + 1000), sessionEndsAt: iso(T0 + 5000) }, T0)).toBe(2000);
    expect(signOutDelay({ expiresAt: iso(T0 + 9000), sessionEndsAt: iso(T0 + 5000) }, T0)).toBe(6000);
    expect(signOutDelay({ expiresAt: iso(T0 - 9000), sessionEndsAt: iso(T0) }, T0)).toBe(0);
    expect(signOutDelay({ expiresAt: "x", sessionEndsAt: "y" }, T0)).toBe(0);
  });
});
