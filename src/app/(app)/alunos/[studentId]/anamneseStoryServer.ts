import { fn } from "storybook/test";
import type { ClientAnamnese } from "@/lib/api/types";

/**
 * A stand-in for `PUT /clients/:id/anamnese` in the Anamnese stories. `answer` picks the reply;
 * `hold` keeps the request open (the saving state). Every other request answers 503.
 */
export const anamneseServer = {
  answer: "ok" as "ok" | "fail" | "forbidden" | "hold",
  updatedAt: "2026-11-25T15:00:00Z",
};

export const SAVED_AT = "2026-11-20T15:00:00Z";

const json = (body: unknown, status = 200) => Response.json(body, { status });

export const anamneseFetch = fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), "http://localhost");
  if (init?.method === "PUT" && /^\/api\/bff\/clients\/\d+\/anamnese$/.test(url.pathname)) {
    const { text } = JSON.parse(String(init.body)) as { text: string };
    if (anamneseServer.answer === "hold") return new Promise<Response>(() => {});
    if (anamneseServer.answer === "fail") return json({ error: { code: "UPSTREAM_UNAVAILABLE", message: "x" } }, 503);
    if (anamneseServer.answer === "forbidden") return json({ error: { code: "FORBIDDEN", message: "x" } }, 403);
    const saved: ClientAnamnese =
      text.trim() === "" ? { text: "", updatedAt: null } : { text, updatedAt: anamneseServer.updatedAt };
    return json(saved);
  }
  return json({ error: { code: "UPSTREAM_UNAVAILABLE", message: "x" } }, 503);
});

/** The bodies of the `PUT`s sent so far. */
export function savesSent(): string[] {
  return anamneseFetch.mock.calls
    .filter(([, init]) => init?.method === "PUT")
    .map(([, init]) => (JSON.parse(String(init!.body)) as { text: string }).text);
}

export function installAnamneseServer() {
  anamneseServer.answer = "ok";
  anamneseFetch.mockClear();
  const original = window.fetch;
  window.fetch = anamneseFetch as typeof fetch;
  return () => {
    window.fetch = original;
  };
}

export const savedText =
  "Objetivo: perder 5 kg e ganhar fôlego para correr 10 km em junho.\nLesões e dores: dor no joelho direito ao agachar fundo. Evitar impacto e saltos.";
