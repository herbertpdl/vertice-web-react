import { NextRequest, NextResponse } from "next/server";
import type { AdminSession } from "@/lib/api/types";
import { adminTokenTimes, clearAdminSession, getAdminSessionToken, setAdminSession } from "@/lib/adminSession";
import { notSignedIn } from "@/lib/adminAuth/responses";
import { bffHeaders, bffUrl, relayBffResponse } from "@/lib/bff";
import { hostGuard } from "@/lib/host";
import { withNoStore } from "@/lib/noStore";
import { guardApiRequest } from "@/lib/requestGuard";

/** The BFF is asked for a new token only once the current one is at least this old (W8). */
export const MIN_RENEW_AGE_MS = 2 * 60 * 1000;

// Renewal (admin-panel spec W8, §2), posted by the shell on the admin's own interactions (60 s per
// tab at most). With every tab sharing one cookie, the token's age keeps the BFF at one renewal
// per 2 minutes per admin. `iat`/`exp` come from the cookie's payload unverified: only to decide
// whether to ask, never to grant anything (the BFF verifies the token it receives).
async function post(request: NextRequest) {
  const wrong = hostGuard(request, "admin");
  if (wrong) return wrong;
  const refused = guardApiRequest(request, "none");
  if (refused) return refused;

  const token = await getAdminSessionToken();
  const times = token ? adminTokenTimes(token) : undefined;
  const now = Date.now();
  if (!token || !times || now >= Date.parse(times.expiresAt)) {
    await clearAdminSession();
    return notSignedIn();
  }
  if (now - Date.parse(times.issuedAt) < MIN_RENEW_AGE_MS) {
    return NextResponse.json({
      renewed: false,
      expiresAt: times.expiresAt,
      sessionEndsAt: times.sessionEndsAt,
    });
  }

  const res = await fetch(bffUrl("/admin/auth/renew"), {
    method: "POST",
    headers: bffHeaders(request, { Authorization: `Bearer ${token}` }),
  });
  if (!res.ok) {
    // 401: suspended, re-roled, reset or a changed password (E42); 403: not an ADMIN token. Either
    // way this session is over. 429 keeps the cookie: the current token is still good.
    if (res.status === 401 || res.status === 403) {
      await clearAdminSession();
      return notSignedIn();
    }
    return relayBffResponse(res);
  }

  const session = (await res.json()) as AdminSession;
  await setAdminSession(session.token, session.expiresAt);
  return NextResponse.json({
    renewed: true,
    expiresAt: session.expiresAt,
    sessionEndsAt: session.sessionEndsAt,
  });
}

export const POST = withNoStore(post);
