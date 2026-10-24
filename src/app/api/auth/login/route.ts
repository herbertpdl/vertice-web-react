import { NextRequest, NextResponse } from "next/server";
import type { components } from "@/lib/api/schema";
import { bffHeaders, bffUrl, readJson, relayBffResponse, validationError } from "@/lib/bff";
import { guardApiRequest } from "@/lib/requestGuard";
import { setSession } from "@/lib/session";
import { APP_ONLY_MESSAGE, isTrainer, TRAINERS_ONLY_CODE } from "@/lib/auth/trainerOnly";
import { loginRequestSchema } from "@/lib/validation/auth";
import { withNoStore } from "@/lib/noStore";

async function post(request: NextRequest) {
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
  if (!res.ok) return relayBffResponse(res);

  const data = (await res.json()) as components["schemas"]["AuthSession"];
  // The web is for trainers only (R1–R5): a client's or admin's correct password gets no session
  // here, and the BFF's token is dropped. A wrong password never gets this far (401 above), so the
  // role is never revealed without it.
  if (!isTrainer(data.user.role)) {
    return NextResponse.json(
      { error: { code: TRAINERS_ONLY_CODE, message: APP_ONLY_MESSAGE } },
      { status: 403 },
    );
  }
  await setSession(data.token, remember ?? false);
  return NextResponse.json({ user: data.user });
}

export const POST = withNoStore(post);
