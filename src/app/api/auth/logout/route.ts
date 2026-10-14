import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest } from "@/lib/requestGuard";
import { clearSession } from "@/lib/session";
import { withNoStore } from "@/lib/noStore";

async function post(request: NextRequest) {
  // Same-origin only: a cross-site page could otherwise sign the user out at will.
  const refused = guardApiRequest(request, "none");
  if (refused) return refused;

  await clearSession();
  return NextResponse.json({ ok: true });
}

export const POST = withNoStore(post);
