import { NextRequest, NextResponse } from "next/server";
import { bffHeaders, bffUrl, relayBffResponse } from "@/lib/bff";
import { getSessionToken } from "@/lib/session";

async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const token = await getSessionToken();

  if (!token) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Not signed in" } },
      { status: 401 },
    );
  }

  const target = `${bffUrl(`/${path.join("/")}`)}${request.nextUrl.search}`;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const res = await fetch(target, {
    method: request.method,
    headers: bffHeaders(request, {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    }),
    body: hasBody ? await request.text() : undefined,
  });

  return relayBffResponse(res);
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PATCH,
  proxy as DELETE,
  proxy as PUT,
};
