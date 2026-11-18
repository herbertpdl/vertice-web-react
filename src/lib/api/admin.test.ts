import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  adminKeys,
  adminProfileQuery,
  fetchAdminActions,
  fetchAdminUserProfile,
  fetchAdminUsers,
} from "./admin";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => vi.stubGlobal("fetch", fetchMock));

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const sentUrl = (call: number) => new URL(String(fetchMock.mock.calls[call]![0]), "http://localhost");

describe("adminKeys", () => {
  it("starts every key with the admin prefix and names the resource next", () => {
    const keys = [
      adminKeys.dashboard(),
      adminKeys.users(),
      adminKeys.usersPage({}, { limit: 25, cursor: null }),
      adminKeys.profile(7),
      adminKeys.actions(),
      adminKeys.actionsPage({}, { limit: 25, cursor: null }),
      adminKeys.suspension(7),
      adminKeys.actionAdmins(),
    ];
    for (const key of keys) expect(key[0]).toBe("admin");
  });

  it("keeps a page under its list's prefix, so invalidating the list reaches every page", () => {
    expect(adminKeys.usersPage({ role: "CLIENT" }, { limit: 10, cursor: "c" }).slice(0, 2)).toEqual(
      adminKeys.users(),
    );
    expect(adminKeys.actionsPage({}, { limit: 10, cursor: null }).slice(0, 2)).toEqual(adminKeys.actions());
  });

  it("keeps the profile outside the lists, so invalidating them never refetches it", () => {
    expect(adminKeys.profile(7).slice(0, 2)).not.toEqual(adminKeys.users());
    expect(adminKeys.profile(7).slice(0, 2)).not.toEqual(adminKeys.actions());
  });
});

describe("adminProfileQuery", () => {
  // Every GET /admin/users/:id writes a history entry: fetched once per visit, never on its own.
  it("never refetches or retries by itself, and is dropped on unmount", () => {
    const options = adminProfileQuery(7);
    expect(options.queryKey).toEqual(["admin", "profile", 7]);
    expect(options).toMatchObject({
      gcTime: 0,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      refetchInterval: false,
      retry: false,
    });
  });

  it("fetches the one profile", async () => {
    fetchMock.mockImplementation(async () => Response.json({ id: 7 }));
    await fetchAdminUserProfile(7);
    expect(sentUrl(0).pathname).toBe("/api/bff/admin/users/7");
  });
});

describe("fetchAdminUsers", () => {
  it("sends the filters, the size and the cursor, and nothing unset", async () => {
    fetchMock.mockImplementation(async () => Response.json({ users: [], nextCursor: null }));

    await fetchAdminUsers({ role: "TRAINER", status: "SUSPENDED", q: "ana" }, { limit: 10, cursor: "c2" });
    const url = sentUrl(0);
    expect(url.pathname).toBe("/api/bff/admin/users");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      role: "TRAINER",
      status: "SUSPENDED",
      q: "ana",
      limit: "10",
      cursor: "c2",
    });

    await fetchAdminUsers({ q: "" }, { limit: 25, cursor: null });
    expect(Object.fromEntries(sentUrl(1).searchParams)).toEqual({ limit: "25" });
  });
});

describe("fetchAdminActions", () => {
  it("sends the filters, the size and the cursor, and nothing unset", async () => {
    fetchMock.mockImplementation(async () => Response.json({ entries: [], nextCursor: null }));

    await fetchAdminActions(
      { adminId: 3, action: "SUSPEND_USER", targetUserId: 9 },
      { limit: 50, cursor: "x" },
    );
    expect(sentUrl(0).pathname).toBe("/api/bff/admin/actions");
    expect(Object.fromEntries(sentUrl(0).searchParams)).toEqual({
      adminId: "3",
      action: "SUSPEND_USER",
      targetUserId: "9",
      limit: "50",
      cursor: "x",
    });

    await fetchAdminActions({}, { limit: 25, cursor: null });
    expect(Object.fromEntries(sentUrl(1).searchParams)).toEqual({ limit: "25" });
  });
});
