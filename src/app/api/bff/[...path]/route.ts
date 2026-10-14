import { NextRequest, NextResponse } from "next/server";
import { bffHeaders, bffProxyPath, bffUrl, relayBffResponse } from "@/lib/bff";
import { guardApiRequest, unsupportedMediaType } from "@/lib/requestGuard";
import { withNoStore } from "@/lib/noStore";
import { getSessionToken } from "@/lib/session";

async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
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

  const token = await getSessionToken();
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
