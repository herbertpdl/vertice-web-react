import { NextRequest } from "next/server";
import { bffHeaders, bffUrl, readJson, relayBffResponse, validationError } from "@/lib/bff";
import { guardApiRequest } from "@/lib/requestGuard";
import { passwordSetupRequestSchema } from "@/lib/validation/auth";
import { withNoStore } from "@/lib/noStore";

// First access from the trainer's setup link (/definir-senha). Public: no session is read or
// set; the client logs in normally afterwards. 204 on success, 400 INVALID_SETUP_TOKEN for an
// unknown, expired or used token.
async function post(request: NextRequest) {
  const refused = guardApiRequest(request, "json");
  if (refused) return refused;

  const parsed = passwordSetupRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError();
  const { token, newPassword } = parsed.data;

  const res = await fetch(bffUrl("/auth/password/setup"), {
    method: "POST",
    headers: bffHeaders(request, { "Content-Type": "application/json" }),
    body: JSON.stringify({ token, newPassword }),
  });
  return relayBffResponse(res);
}

export const POST = withNoStore(post);
