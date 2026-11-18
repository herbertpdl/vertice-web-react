import { NextRequest, NextResponse } from "next/server";
import type { components } from "@/lib/api/schema";
import { bffHeaders, bffUrl, readJson, relayBffResponse, validationError } from "@/lib/bff";
import { hostGuard } from "@/lib/host";
import { guardApiRequest } from "@/lib/requestGuard";
import { setSession } from "@/lib/session";
import {
  ADMIN_LOGIN_ELSEWHERE_CODE,
  APP_ONLY_MESSAGE,
  isTrainer,
  TRAINERS_ONLY_CODE,
} from "@/lib/auth/trainerOnly";
import { loginRequestSchema } from "@/lib/validation/auth";
import { withNoStore } from "@/lib/noStore";

async function post(request: NextRequest) {
  // www only (admin-panel spec W3): on the admin host this is a 404.
  const wrong = hostGuard(request, "trainer");
  if (wrong) return wrong;
  const refused = guardApiRequest(request, "json");
  if (refused) return refused;

  const parsed = loginRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError();
  const { email, password, remember } = parsed.data;

  // Typed from the generated contract, so a changed login body fails `npm run typecheck` here.
  const upstream: components["schemas"]["LoginRequest"] = { email, password };
  const res = await fetch(bffUrl("/auth/login"), {
    method: "POST",
    headers: bffHeaders(request, { "Content-Type": "application/json" }),
    body: JSON.stringify(upstream),
  });
  if (!res.ok) {
    // An admin's correct password (BFF B9): the same answer as a client's below, so www reads as
    // today (R3, E2) and the BFF body is dropped. Every other refusal, `ACCOUNT_SUSPENDED`
    // included, is relayed as-is.
    if (res.status === 403 && (await errorCode(res.clone())) === ADMIN_LOGIN_ELSEWHERE_CODE) {
      return trainersOnly();
    }
    return relayBffResponse(res);
  }

  const data = (await res.json()) as components["schemas"]["AuthSession"];
  // The web is for trainers only (R1–R5): a client's correct password gets no session here, and
  // the BFF's token is dropped. A wrong password never gets this far (401 above), so the role is
  // never revealed without it. An admin's is refused here too by a BFF from before VRT-28 (or
  // after a rollback of it).
  if (!isTrainer(data.user.role)) return trainersOnly();
  await setSession(data.token, remember ?? false);
  return NextResponse.json({ user: data.user });
}

function trainersOnly(): NextResponse {
  return NextResponse.json(
    { error: { code: TRAINERS_ONLY_CODE, message: APP_ONLY_MESSAGE } },
    { status: 403 },
  );
}

/** The `error.code` of a BFF error body, or `undefined` when the body isn't one. */
async function errorCode(res: Response): Promise<unknown> {
  try {
    const body = (await res.json()) as { error?: { code?: unknown } } | null;
    return body?.error?.code;
  } catch {
    return undefined;
  }
}

export const POST = withNoStore(post);
