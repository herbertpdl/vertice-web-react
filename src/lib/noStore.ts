// Every /api/bff and /api/auth response is per-user (it depends on the session cookie) and may
// carry personal data (a revealed CPF, the caller's email), so no browser or shared cache may keep
// it or serve it to another session. Set here, whatever the BFF's own headers say.
export const NO_STORE_HEADERS = { "Cache-Control": "no-store", Vary: "Cookie" } as const;

/** Wraps a route handler so every response it returns, refusals included, is `no-store`. */
export function withNoStore<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    const res = await handler(...args);
    for (const [name, value] of Object.entries(NO_STORE_HEADERS)) res.headers.set(name, value);
    return res;
  };
}
