// Which client address the BFF should rate-limit on, given the X-Forwarded-For header this
// server received. Pure (no `server-only`) so it can be unit-tested; `src/lib/bff.ts` wires it up
// with the hop count from `TRUSTED_PROXY_HOPS`, parsed and validated in `src/lib/env.server.ts`.
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
