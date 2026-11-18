import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionToken } from "@/lib/adminSession";
import { bffHeaders, bffProxyPath, bffUrl, relayBffResponse } from "@/lib/bff";
import { bffPathAllowed } from "@/lib/bffAllowList";
import { hostGuard, workspaceOf, wrongHost } from "@/lib/host";
import { guardApiRequest, unsupportedMediaType } from "@/lib/requestGuard";
import { withNoStore } from "@/lib/noStore";
import { getSessionToken } from "@/lib/session";

// Both hosts (admin-panel spec W3, W5): each forwards only its own allow-list, with only its own
// cookie's token, so a trainer token never leaves www and an admin token never leaves the admin
// host.
async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const wrong = hostGuard(request, "any");
  if (wrong) return wrong;
  const refused = guardApiRequest(request, "optional-json");
  if (refused) return refused;

  const { path } = await params;
  const upstream = bffProxyPath(path);
  if (!upstream) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid path" } },
      { status: 400 },
    );
  }

  const workspace = workspaceOf(request.headers);
  // Before any cookie is read: a refused path is the same 404 as an unknown one.
  if (!bffPathAllowed(workspace, request.method, upstream)) return wrongHost();

  const token = workspace === "admin" ? await getAdminSessionToken() : await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Not signed in" } },
      { status: 401 },
    );
  }

  const target = `${bffUrl(upstream)}${request.nextUrl.search}`;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.text() : undefined;
  // A body with no Content-Type at all (a cross-site `fetch` of an untyped Blob) is not JSON either.
  if (body && !request.headers.has("content-type")) return unsupportedMediaType();

  const res = await fetch(target, {
    method: request.method,
    headers: bffHeaders(request, {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    }),
    body,
  });

  return relayBffResponse(res);
}

const handler = withNoStore(proxy);

export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as DELETE,
  handler as PUT,
};
