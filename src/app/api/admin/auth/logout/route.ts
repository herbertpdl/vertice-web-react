import { NextRequest, NextResponse } from "next/server";
import { clearAdminChallenge, clearAdminSession } from "@/lib/adminSession";
import { hostGuard } from "@/lib/host";
import { withNoStore } from "@/lib/noStore";
import { guardApiRequest } from "@/lib/requestGuard";

// Clears both admin cookies (admin-panel spec W9, §2). Admin tokens are stateless, so there is
// nothing to revoke upstream: the cookie was the only copy.
async function post(request: NextRequest) {
  const wrong = hostGuard(request, "admin");
  if (wrong) return wrong;
  // Same-origin only: a cross-site page could otherwise sign the admin out at will.
  const refused = guardApiRequest(request, "none");
  if (refused) return refused;

  await clearAdminSession();
  await clearAdminChallenge();
  return NextResponse.json({ ok: true });
}

export const POST = withNoStore(post);
