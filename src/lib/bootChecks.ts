import { serverEnv } from "./env.server";

/**
 * Startup checks, called from `src/instrumentation.ts` (Node.js runtime only). A misconfigured
 * production deploy exits at boot with one clear line instead of a 500 on the first login.
 * `bffHeaders` keeps the same check per call (`serverEnv()` doesn't cache a failed parse).
 */
export function checkBootConfig(): void {
  try {
    serverEnv();
  } catch (error) {
    console.error(`[vertice] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
