// Which client address the BFF should rate-limit on, given the X-Forwarded-For header this
// server received. Pure (no `server-only`) so it can be unit-tested; `src/lib/bff.ts` wires it up.
//
// The BFF sees this Next server as the peer of every web call, so without help every web user
// shares one rate-limit bucket. We send `X-Forwarded-For` and the BFF (`TRUST_PROXY` = this
// server's address) takes the right-most entry as the client IP. That entry must be one a
// browser can't choose.
//
// Next 16 doesn't expose the socket address to route handlers (`NextRequest.ip` was removed in
// v15). Its server only fills `x-forwarded-for` from the socket when the request has none
// (`req.headers['x-forwarded-for'] ??= socket.remoteAddress` in base-server). So:
// - Next reached directly (local dev, `TRUSTED_PROXY_HOPS=0`): the last entry is the socket
//   address, unless the browser sent its own header, which Next then keeps as-is. Nothing in a
//   route handler can tell the two apart; production must not run like this.
// - Behind N reverse proxies that each append their peer (`TRUSTED_PROXY_HOPS=N`): the last N
//   entries were written by those proxies, and the N-th from the right is the address the
//   outermost one observed: the real client. Everything left of it came from the browser.
//
// We forward the chain up to and including that entry, so it is the right-most one the BFF sees.
// The entries to the right of it (our own proxies' peers) are dropped: the BFF doesn't trust them
// and would otherwise pick one of them.

export function parseTrustedProxyHops(value: string | undefined): number {
  if (!value) return 0;
  const hops = Number(value);
  return Number.isInteger(hops) && hops >= 0 ? hops : 0;
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
  return entries.slice(0, clientIndex + 1).join(", ");
}
