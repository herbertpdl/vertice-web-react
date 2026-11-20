import { NextRequest, NextResponse } from "next/server";
import { bffHeaders, bffUrl, relayBffResponse } from "@/lib/bff";
import { hostGuard } from "@/lib/host";
import { withNoStore } from "@/lib/noStore";
import { guardApiRequest } from "@/lib/requestGuard";
import { getSessionToken } from "@/lib/session";

/**
 * The assistant's streamed answer (ai-workout-assistant spec, "Transport"; assessment F3). Its
 * own handler because `/api/bff` buffers every response: this one hands the BFF's
 * `text/event-stream` body straight to the browser, and passes the browser request's abort
 * signal upstream so "Parar" and leaving the editor cancel the BFF (and the model) too.
 */
async function workoutChat(request: NextRequest): Promise<Response> {
  const wrong = hostGuard(request, "trainer");
  if (wrong) return wrong;
  const refused = guardApiRequest(request, "json");
  if (refused) return refused;

  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Not signed in" } },
      { status: 401 },
    );
  }

  const res = await fetch(bffUrl("/assistant/workout-chat"), {
    method: "POST",
    headers: bffHeaders(request, {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    }),
    body: await request.text(),
    signal: request.signal,
  });

  const isStream = res.headers.get("Content-Type")?.toLowerCase().startsWith("text/event-stream");
  if (!res.ok || !isStream || !res.body) return relayBffResponse(res);

  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // `no-transform` keeps Next's gzip (and any proxy) from buffering the chunks.
      "Cache-Control": "no-store, no-transform",
      Vary: "Cookie",
      "X-Accel-Buffering": "no",
    },
  });
}

// Refusals are JSON and get `withNoStore`'s headers; the stream sets its own (a superset).
const guarded = async (req: NextRequest): Promise<Response> => {
  const res = await workoutChat(req);
  if (res.headers.get("Content-Type")?.startsWith("text/event-stream")) return res;
  return withNoStore(async () => res)();
};

export { guarded as POST };
