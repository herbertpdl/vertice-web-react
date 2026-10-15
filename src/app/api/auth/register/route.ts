import { NextRequest, NextResponse } from "next/server";
import { bffHeaders, bffUrl, readJson, relayBffResponse, validationError } from "@/lib/bff";
import { guardApiRequest } from "@/lib/requestGuard";
import { setSession } from "@/lib/session";
import { registerRequestSchema } from "@/lib/validation/auth";
import { withNoStore } from "@/lib/noStore";

// Public sign-up is for trainers only: clients are created by their trainer (POST /clients).
// The role is set here, never taken from the browser.
async function post(request: NextRequest) {
  const refused = guardApiRequest(request, "json");
  if (refused) return refused;

  const parsed = registerRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError();
  const { name, email, cpf, cref, password, acceptedTermsVersion, remember } = parsed.data;

  const res = await fetch(bffUrl("/auth/register"), {
    method: "POST",
    headers: bffHeaders(request, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      name,
      email,
      password,
      cpf,
      cref: cref || undefined,
      role: "TRAINER",
      acceptedTermsVersion,
    }),
  });
  if (!res.ok) return relayBffResponse(res);

  const data = await res.json();
  await setSession(data.token, remember ?? false);
  return NextResponse.json({ user: data.user });
}

export const POST = withNoStore(post);
