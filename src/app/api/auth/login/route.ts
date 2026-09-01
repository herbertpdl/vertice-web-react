import { NextRequest, NextResponse } from "next/server";
import { bffUrl } from "@/lib/bff";
import { setSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { remember, ...loginBody } = body as {
    email: string;
    password: string;
    remember?: boolean;
  };

  const res = await fetch(bffUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(loginBody),
  });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  await setSession(data.token, remember ?? false);
  return NextResponse.json({ user: data.user });
}
