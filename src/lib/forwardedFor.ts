// Which client address the BFF should rate-limit on, given the X-Forwarded-For header this
// server received. Pure (no `server-only`) so it can be unit-tested; `src/lib/bff.ts` wires it up.
//
// The BFF sees this Next server as the peer of every web call, so without help every web user
// shares one rate-limit bucket. We send `X-Forwarded-For` and the BFF (`TRUST_PROXY` = this
// server's address) takes it as the client IP. That address must be one a browser can't choose:
// a forged one lets an attacker dodge every per-IP/per-network limit, or fail logins "as" a
// victim's IP to lock the victim out.
//
// Next 16 doesn't expose the socket address to route handlers (`NextRequest.ip` was removed in
// v15). Its server only fills `x-forwarded-for` from the socket when the request has none
// (`req.headers['x-forwarded-for'] ??= socket.remoteAddress` in base-server). So:
// - Next reached directly (`TRUSTED_PROXY_HOPS=0`): the last entry is the socket address, unless
//   the browser sent its own header, which Next then keeps as-is. Nothing in a route handler can
//   tell the two apart, so this is only safe for local dev.
// - Behind N reverse proxies that each append their peer (`TRUSTED_PROXY_HOPS=N`): the last N
//   entries were written by those proxies, and the N-th from the right is the address the
//   outermost one observed: the real client. Everything left of it came from the browser.
//
// We forward only that one entry. The browser-supplied part to its left is dropped, so nothing
// the browser wrote ever reaches the BFF, whatever its TRUST_PROXY says.

export class TrustedProxyHopsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrustedProxyHopsError";
  }
}

/**
 * `TRUSTED_PROXY_HOPS` as a hop count. Fails closed: in production it must be set explicitly
 * (`0` is a deliberate opt-in to "Next is reached directly"), and a value that isn't a
 * non-negative integer is refused everywhere rather than read as 0.
 */
export function resolveTrustedProxyHops(env: {
  NODE_ENV?: string;
  TRUSTED_PROXY_HOPS?: string;
}): number {
  const value = env.TRUSTED_PROXY_HOPS?.trim();
  if (!value) {
    if (env.NODE_ENV === "production") {
      throw new TrustedProxyHopsError(
        "TRUSTED_PROXY_HOPS must be set in production: the number of reverse proxies in front " +
          "of this server that append to X-Forwarded-For (0 only if Next is reached directly " +
          "and you accept that browsers can choose their rate-limit IP). See README, Deployment.",
      );
    }
    return 0;
  }
  if (!/^\d+$/.test(value)) {
    throw new TrustedProxyHopsError(
      `TRUSTED_PROXY_HOPS must be a non-negative integer, got "${env.TRUSTED_PROXY_HOPS}"`,
    );
  }
  return Number(value);
}

export function forwardedFor(
  incoming: string | null | undefined,
  trustedProxyHops: number,
): string | undefined {
  const entries = (incoming ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) return undefined;
  // With no proxy, Next itself wrote the last entry (when the browser sent none).
  const clientIndex = Math.max(0, entries.length - Math.max(trustedProxyHops, 1));
  return entries[clientIndex];
}
