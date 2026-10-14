import "server-only";
import { z } from "zod";

// Server config, parsed from `process.env` with Zod. Every server-side read of app config goes
// through `serverEnv()`; nothing else reads `process.env` (the `NEXT_RUNTIME`/`NEXT_PHASE` checks in
// `src/instrumentation.ts` are Next internals, not app config). There are no `NEXT_PUBLIC_*`
// values: the browser only talks to this app's own `/api` routes.
//
// Parsed lazily, on the first call, rather than at import: `next build` loads server modules but
// runs without the deploy env (see `src/instrumentation.ts`), and must still succeed.

export const DEFAULT_BFF_URL = "http://localhost:3000";

export class ServerEnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerEnvError";
  }
}

// Unset and blank both mean "use the default".
const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const serverEnvSchema = z
  .object({
    // Only "production" changes behaviour (Secure cookie, TRUSTED_PROXY_HOPS required). Other
    // values are accepted as-is, as before.
    NODE_ENV: z.string().optional(),
    /** Base URL of vertice-bff; the routes call `${BFF_URL}/api/<path>`. */
    BFF_URL: z.preprocess(
      blankToUndefined,
      z
        .url({
          protocol: /^https?$/,
          error: (issue) => `BFF_URL must be an http(s) URL, got "${String(issue.input)}"`,
        })
        .default(DEFAULT_BFF_URL),
    ),
    /**
     * How many reverse proxies in front of this server append to X-Forwarded-For (see
     * `forwardedFor.ts` and `.env.local.example`). Fails closed: in production it must be set
     * explicitly (`0` is a deliberate opt-in to "Next is reached directly"), and a value that
     * isn't a non-negative integer is refused everywhere rather than read as 0.
     */
    TRUSTED_PROXY_HOPS: z
      .string()
      .optional()
      .transform((value, ctx) => {
        const hops = value?.trim();
        if (!hops) return undefined; // unset: the production check below decides
        if (!/^\d+$/.test(hops)) {
          ctx.addIssue({
            code: "custom",
            message: `TRUSTED_PROXY_HOPS must be a non-negative integer, got "${value}"`,
          });
          return z.NEVER;
        }
        return Number(hops);
      }),
  })
  .transform((env, ctx) => {
    const isProduction = env.NODE_ENV === "production";
    if (env.TRUSTED_PROXY_HOPS === undefined && isProduction) {
      ctx.addIssue({
        code: "custom",
        message:
          "TRUSTED_PROXY_HOPS must be set in production: the number of reverse proxies in " +
          "front of this server that append to X-Forwarded-For (0 only if Next is reached " +
          "directly and you accept that browsers can choose their rate-limit IP). See README, " +
          "Deployment.",
      });
      return z.NEVER;
    }
    return {
      nodeEnv: env.NODE_ENV,
      isProduction,
      bffUrl: env.BFF_URL.replace(/\/$/, ""),
      trustedProxyHops: env.TRUSTED_PROXY_HOPS ?? 0,
    };
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Parses `source`; throws a `ServerEnvError` naming every invalid variable. */
export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    throw new ServerEnvError(result.error.issues.map((issue) => issue.message).join("; "));
  }
  return result.data;
}

let cached: ServerEnv | undefined;

/**
 * The parsed server config, parsed once. An invalid config is not cached: every call throws again,
 * so a misconfigured production server fails each BFF call (and `src/lib/bootChecks.ts` exits at
 * boot) instead of running on a guess.
 */
export function serverEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}

/** Tests stub `process.env` per case; this drops the parsed copy so the next call re-reads it. */
export function resetServerEnvForTests(): void {
  cached = undefined;
}
