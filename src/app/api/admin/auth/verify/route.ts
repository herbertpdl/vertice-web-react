import { NextRequest, NextResponse } from "next/server";
import type { components } from "@/lib/api/schema";
import type { AdminSession } from "@/lib/api/types";
import { clearAdminChallenge, getAdminChallenge, setAdminSession } from "@/lib/adminSession";
import { challengeMissing } from "@/lib/adminAuth/responses";
import { bffHeaders, bffUrl, readJson, relayBffResponse, validationError } from "@/lib/bff";
import { hostGuard } from "@/lib/host";
import { withNoStore } from "@/lib/noStore";
import { guardApiRequest } from "@/lib/requestGuard";
import { adminVerifyRequestSchema } from "@/lib/validation/admin";

// The code step (admin-panel spec W7, W10, §2). On success the session cookie is set (lifetime =
// the token's own), the challenge cleared, and the browser gets only `{user, expiresAt,
// sessionEndsAt}`: the token never reaches a body it can read. A wrong code (400
// INVALID_SECOND_FACTOR_CODE) keeps the challenge for another try; 401 CHALLENGE_INVALID and 409
// PRECONDITION_FAILED end it (back to the password); 429 (locked) is relayed with Retry-After.
async function post(request: NextRequest) {
  const wrong = hostGuard(request, "admin");
  if (wrong) return wrong;
  const refused = guardApiRequest(request, "json");
  if (refused) return refused;

  // A malformed code never reaches the BFF (nor spends a try of the lockout).
  const parsed = adminVerifyRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError();

  const challenge = await getAdminChallenge();
  if (!challenge) return challengeMissing();

  const upstream: components["schemas"]["AdminVerifyRequest"] = { challenge, code: parsed.data.code };
  const res = await fetch(bffUrl("/admin/auth/verify"), {
    method: "POST",
    headers: bffHeaders(request, { "Content-Type": "application/json" }),
    body: JSON.stringify(upstream),
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 409) await clearAdminChallenge();
    return relayBffResponse(res);
  }

  const { token, expiresAt, sessionEndsAt, user } = (await res.json()) as AdminSession;
  await clearAdminChallenge();
  // Only an ADMIN token is ever stored on this host (the BFF signs no other here; a guard against
  // a contract slip, not a rule of its own).
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
  }
  await setAdminSession(token, expiresAt);
  return NextResponse.json({ user, expiresAt, sessionEndsAt });
}

export const POST = withNoStore(post);
