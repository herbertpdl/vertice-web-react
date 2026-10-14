import { resolveTrustedProxyHops } from "./forwardedFor";

/**
 * Startup checks, called from `src/instrumentation.ts` (Node.js runtime only). A misconfigured
 * production deploy exits at boot with one clear line instead of a 500 on the first login.
 * `bffHeaders` keeps the same check per call.
 */
export function checkBootConfig(): void {
  try {
    resolveTrustedProxyHops(process.env);
  } catch (error) {
    console.error(`[vertice] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
