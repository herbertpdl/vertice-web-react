// The page Content-Security-Policy, built per request by `src/proxy.ts` around a fresh nonce.
// Next reads the nonce back out of the request's CSP header (`Content-Security-Policy` or
// `-Report-Only`) while rendering and puts it on its own scripts and inline styles; the root
// layout renders per request (`connection()`) so every page gets one. See
// node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md.
//
// Shipped as `Content-Security-Policy-Report-Only` first (audit plan P1-08): violations show in
// the browser console and nothing is blocked. Switch the header name in `proxy.ts` once a release
// runs clean. The always-safe directives (`frame-ancestors`, `object-src`, `base-uri`,
// `form-action`) are already enforced by the static header in `next.config.ts`.

export const CSP_HEADER = "Content-Security-Policy-Report-Only";

/** 128 random bits, base64. */
export function createNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
}

export function buildContentSecurityPolicy(nonce: string, { dev }: { dev: boolean }): string {
  return [
    "default-src 'self'",
    // `'strict-dynamic'`: scripts the nonced Next runtime loads (route chunks) are trusted too.
    // `next dev` needs `'unsafe-eval'` (React rebuilds server error stacks with eval).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // `next dev` injects styles without a nonce. `style-src-attr`: React renders `style={…}` as
    // attributes (Dropdown's fixed position, progress bars), which a nonce can't cover.
    `style-src 'self' ${dev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    // next/font self-hosts the Google fonts under /_next/static.
    "font-src 'self'",
    // The browser only talks to this app's /api routes (and, in dev, the HMR websocket).
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
