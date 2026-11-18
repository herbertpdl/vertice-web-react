import { NextRequest, NextResponse } from "next/server";
import { hostGuard } from "@/lib/host";
import { guardApiRequest } from "@/lib/requestGuard";
import { clearSession } from "@/lib/session";
import { withNoStore } from "@/lib/noStore";

async function post(request: NextRequest) {
  // www only (admin-panel spec W3): on the admin host this is a 404.
  const wrong = hostGuard(request, "trainer");
  if (wrong) return wrong;
  // Same-origin only: a cross-site page could otherwise sign the user out at will.
  const refused = guardApiRequest(request, "none");
  if (refused) return refused;

  await clearSession();
  return NextResponse.json({ ok: true });
}

export const POST = withNoStore(post);
