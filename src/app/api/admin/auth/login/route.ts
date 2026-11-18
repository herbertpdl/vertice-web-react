import { NextRequest, NextResponse } from "next/server";
import type { components } from "@/lib/api/schema";
import type { AdminChallenge } from "@/lib/api/types";
import { setAdminChallenge } from "@/lib/adminSession";
import { bffHeaders, bffUrl, readJson, relayBffResponse, validationError } from "@/lib/bff";
import { hostGuard } from "@/lib/host";
import { withNoStore } from "@/lib/noStore";
import { guardApiRequest } from "@/lib/requestGuard";
import { adminLoginSchema } from "@/lib/validation/admin";

// The admin password step (admin-panel spec W7, §2). The challenge goes into its own short-lived
// cookie and never into a body the browser sees. A wrong password and a trainer's or client's
// correct one are the same BFF 401 (R4), relayed as-is; so are 403 ACCOUNT_SUSPENDED and 429.
async function post(request: NextRequest) {
  const wrong = hostGuard(request, "admin");
  if (wrong) return wrong;
  const refused = guardApiRequest(request, "json");
  if (refused) return refused;

  const parsed = adminLoginSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError();

  const upstream: components["schemas"]["LoginRequest"] = parsed.data;
  const res = await fetch(bffUrl("/admin/auth/login"), {
    method: "POST",
    headers: bffHeaders(request, { "Content-Type": "application/json" }),
    body: JSON.stringify(upstream),
  });
  if (!res.ok) return relayBffResponse(res);

  const { challenge, challengeExpiresAt, secondFactor } = (await res.json()) as AdminChallenge;
  await setAdminChallenge(challenge, challengeExpiresAt);
  return NextResponse.json({ secondFactor, challengeExpiresAt });
}

export const POST = withNoStore(post);
