import { fn } from "storybook/test";
import { adminFeatureFlags } from "@/components/domain/adminStoryFixtures";
import type { FeatureFlag, FeatureFlagUser } from "@/lib/api/types";

/**
 * A stand-in for the four `/admin/feature-flags` routes over an in-memory list (feature-flags spec
 * §3), shared by the two flag pages' stories. Writes change the list, so the refetch that follows
 * shows them. Knobs per story: the list's mode, a held list (`holdLists`), and each write's answer.
 */
export type WriteAnswer = "ok" | "fail" | "gone" | "hold";

export const flagServer = {
  flags: adminFeatureFlags(),
  list: "ok" as "ok" | "pending" | "error",
  /** Every `GET` waits until `releaseLists()` and then answers the list as it is at that moment. */
  holdLists: false,
  heldLists: [] as (() => void)[],
  write: "ok" as WriteAnswer,
  heldWrites: [] as (() => void)[],
};

export function resetFlagServer() {
  flagServer.flags = adminFeatureFlags();
  flagServer.list = "ok";
  flagServer.holdLists = false;
  flagServer.heldLists = [];
  flagServer.write = "ok";
  flagServer.heldWrites = [];
  flagFetch.mockClear();
}

export function releaseLists() {
  flagServer.holdLists = false;
  const held = flagServer.heldLists;
  flagServer.heldLists = [];
  held.forEach((release) => release());
}

export function releaseWrites() {
  const held = flagServer.heldWrites;
  flagServer.heldWrites = [];
  held.forEach((release) => release());
}

const json = (body: unknown, status = 200) => Response.json(body, { status });
const clone = (flags: FeatureFlag[]) => JSON.parse(JSON.stringify(flags)) as FeatureFlag[];

function applyWrite(method: string, key: string, rest: string[], body: { enabled?: boolean } | undefined) {
  const flag = flagServer.flags.find((candidate) => candidate.key === key);
  if (!flag) return json({ error: { code: "NOT_FOUND", message: "x" } }, 404);
  if (rest[0] === "everyone") {
    flag.enabled = body!.enabled!;
  } else {
    const userId = Number(rest[1]);
    const users = flag.users.filter((user: FeatureFlagUser) => user.userId !== userId);
    if (method === "PUT") users.push({ userId, enabled: body!.enabled! });
    flag.users = users.sort((a: FeatureFlagUser, b: FeatureFlagUser) => a.userId - b.userId);
  }
  return json(flag);
}

export const flagFetch = fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), "http://localhost");
  const method = init?.method ?? "GET";
  const [key, ...rest] = url.pathname
    .replace(/^\/api\/bff\/admin\/feature-flags\/?/, "")
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent);

  if (!key) {
    if (flagServer.list === "pending") return new Promise<Response>(() => {});
    if (flagServer.list === "error") return json({ error: { code: "UPSTREAM_UNAVAILABLE", message: "x" } }, 503);
    if (flagServer.holdLists) {
      return new Promise<Response>((resolve) => {
        flagServer.heldLists.push(() => resolve(json({ flags: clone(flagServer.flags) })));
      });
    }
    return json({ flags: clone(flagServer.flags) });
  }

  const body = init?.body ? (JSON.parse(String(init.body)) as { enabled?: boolean }) : undefined;
  const answer = flagServer.write;
  if (answer === "fail") return json({ error: { code: "UPSTREAM_UNAVAILABLE", message: "x" } }, 503);
  if (answer === "gone") {
    flagServer.flags = flagServer.flags.filter((flag) => flag.key !== key);
    return json({ error: { code: "NOT_FOUND", message: "x" } }, 404);
  }
  if (answer === "hold") {
    return new Promise<Response>((resolve) => {
      flagServer.heldWrites.push(() => resolve(applyWrite(method, key, rest, body)));
    });
  }
  return applyWrite(method, key, rest, body);
});

/** The writes sent so far, as `METHOD path body`. */
export function writesSent(): string[] {
  return flagFetch.mock.calls
    .filter(([, init]) => (init?.method ?? "GET") !== "GET")
    .map(([input, init]) => {
      const path = new URL(String(input), "http://localhost").pathname.replace("/api/bff", "");
      return `${init!.method} ${path}${init?.body ? ` ${String(init.body)}` : ""}`;
    });
}

/** How many times the list was fetched. */
export function listFetches(): number {
  return flagFetch.mock.calls.filter(([input, init]) => {
    const path = new URL(String(input), "http://localhost").pathname;
    return (init?.method ?? "GET") === "GET" && path === "/api/bff/admin/feature-flags";
  }).length;
}
