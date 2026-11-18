import { NextRequest } from "next/server";
import type { components } from "@/lib/api/schema";
import { clearAdminChallenge, getAdminChallenge } from "@/lib/adminSession";
import { challengeMissing } from "@/lib/adminAuth/responses";
import { bffHeaders, bffUrl, relayBffResponse } from "@/lib/bff";
import { hostGuard } from "@/lib/host";
import { withNoStore } from "@/lib/noStore";
import { guardApiRequest } from "@/lib/requestGuard";

// Authenticator enrolment (admin-panel spec W7, §2): the challenge comes from its cookie, and the
// answer is `{provisioningUri}` (a new secret on every call, BFF B14), relayed `no-store` and never
// logged. 409 PRECONDITION_FAILED (already enrolled) and 429 are relayed; the screen moves to the
// code step on the first.
async function post(request: NextRequest) {
  const wrong = hostGuard(request, "admin");
  if (wrong) return wrong;
  const refused = guardApiRequest(request, "none");
  if (refused) return refused;

  const challenge = await getAdminChallenge();
  if (!challenge) return challengeMissing();

  const upstream: components["schemas"]["AdminEnrollRequest"] = { challenge };
  const res = await fetch(bffUrl("/admin/auth/enroll"), {
    method: "POST",
    headers: bffHeaders(request, { "Content-Type": "application/json" }),
    body: JSON.stringify(upstream),
  });
  // An invalid or expired challenge can't be used again: drop it, the sign-in restarts.
  if (res.status === 401) await clearAdminChallenge();
  return relayBffResponse(res);
}

export const POST = withNoStore(post);
