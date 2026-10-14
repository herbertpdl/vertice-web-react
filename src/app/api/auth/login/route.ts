import { NextRequest, NextResponse } from "next/server";
import { bffHeaders, bffUrl, readJson, relayBffResponse, validationError } from "@/lib/bff";
import { setSession } from "@/lib/session";
import { loginRequestSchema } from "@/lib/validation/auth";

export async function POST(request: NextRequest) {
  const parsed = loginRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError();
  const { email, password, remember } = parsed.data;

  const res = await fetch(bffUrl("/auth/login"), {
    method: "POST",
    headers: bffHeaders(request, { "Content-Type": "application/json" }),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return relayBffResponse(res);

  const data = await res.json();
  await setSession(data.token, remember ?? false);
  return NextResponse.json({ user: data.user });
}
