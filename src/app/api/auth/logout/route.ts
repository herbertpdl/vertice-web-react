import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest } from "@/lib/requestGuard";
import { clearSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  // Same-origin only: a cross-site page could otherwise sign the user out at will.
  const refused = guardApiRequest(request, "none");
  if (refused) return refused;

  await clearSession();
  return NextResponse.json({ ok: true });
}
