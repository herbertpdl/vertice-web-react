import { NextRequest, NextResponse } from "next/server";
import { adminTokenTimes, getAdminSessionToken } from "@/lib/adminSession";
import { notSignedIn } from "@/lib/adminAuth/responses";
import { hostGuard } from "@/lib/host";
import { withNoStore } from "@/lib/noStore";
import { guardApiRequest } from "@/lib/requestGuard";

// The current cookie's times (admin-panel spec W8, §2), read by a tab's sign-out timer before it
// signs out, since another tab may have renewed the shared cookie. A status read, not a renewal:
// it calls nothing upstream, sets no cookie and never extends anything.
async function get(request: NextRequest) {
  const wrong = hostGuard(request, "admin");
  if (wrong) return wrong;
  const refused = guardApiRequest(request, "none");
  if (refused) return refused;

  const token = await getAdminSessionToken();
  const times = token ? adminTokenTimes(token) : undefined;
  if (!times || Date.now() >= Date.parse(times.expiresAt)) return notSignedIn();
  return NextResponse.json({ expiresAt: times.expiresAt, sessionEndsAt: times.sessionEndsAt });
}

export const GET = withNoStore(get);
