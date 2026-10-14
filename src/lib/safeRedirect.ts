// Where to send the user after login, from the `?redirect=` that `src/proxy.ts` sets when it
// bounces a signed-out visit to /login. The value comes from the URL, so anyone can craft it:
// only a same-origin path is accepted, anything else falls back to the dashboard (no open
// redirect to a look-alike login page). Pure, so both `proxy.ts` and `LoginForm` use it.

export const DEFAULT_REDIRECT = "/dashboard";

// Browsers drop tab/CR/LF anywhere in a URL and read "\" as "/", so "/\tevil", "/\evil" and
// "/\n/evil" all become "//evil" (protocol-relative: another host). Refuse them outright.
const UNSAFE_CHARS = /[\u0000-\u001F\u007F\\]/;

function isLocalPath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//") && !UNSAFE_CHARS.test(value);
}

function decoded(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

/**
 * `value` as a path on `origin` (pathname + search + hash), or `/dashboard` unless it is one:
 * exactly one leading `/` (not `//` or `/\`), no scheme, no control characters, and it resolves
 * to `origin`. The percent-decoded form must pass the same checks, so a consumer that decodes
 * once more (`/%2F%2Fevil.example`) can't turn it into another host either.
 */
export function safeRedirectPath(value: string | null | undefined, origin: string): string {
  if (!value) return DEFAULT_REDIRECT;
  const plain = decoded(value);
  if (plain === undefined || !isLocalPath(value) || !isLocalPath(plain)) return DEFAULT_REDIRECT;

  let url: URL;
  try {
    url = new URL(value, origin);
  } catch {
    return DEFAULT_REDIRECT;
  }
  if (url.origin !== new URL(origin).origin) return DEFAULT_REDIRECT;
  return `${url.pathname}${url.search}${url.hash}`;
}
