import { NextRequest, NextResponse } from "next/server";
import { bffUrl } from "@/lib/bff";
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
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    body: hasBody ? await request.text() : undefined,
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PATCH,
  proxy as DELETE,
  proxy as PUT,
};
