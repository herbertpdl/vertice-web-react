import "server-only";
import { NextResponse } from "next/server";

// The errors the `/api/admin/auth/*` handlers mint themselves, before or instead of a BFF call.
// Same `{error: {code, message}}` shape as the BFF's, so the screen keys on `code` alike.

/** No challenge cookie (expired, cleared or never set): the sign-in starts again (W10). */
export function challengeMissing(): NextResponse {
  return NextResponse.json(
    { error: { code: "CHALLENGE_INVALID", message: "Sign in again" } },
    { status: 401 },
  );
}

/** No usable admin session cookie. */
export function notSignedIn(): NextResponse {
  return NextResponse.json(
    { error: { code: "UNAUTHENTICATED", message: "Not signed in" } },
    { status: 401 },
  );
}
