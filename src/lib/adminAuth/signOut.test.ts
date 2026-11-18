import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isSigningOut, resetSignOutForTests, signOutAdmin, startRenew } from "./signOut";

const location = { href: "/painel" };
const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ ok: true }));

beforeEach(() => {
  resetSignOutForTests();
  location.href = "/painel";
  vi.stubGlobal("window", { location });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockClear();
});

describe("signOutAdmin", () => {
  it("clears the admin cookies, then lands on the sign-in with the reason", async () => {
    await signOutAdmin("expirou");
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/auth/logout", { method: "POST" });
    expect(location.href).toBe("/painel/entrar?motivo=expirou");
  });

  it("goes to the plain sign-in for \"Sair\", and after a password change says so", async () => {
    await signOutAdmin();
    expect(location.href).toBe("/painel/entrar");
    resetSignOutForTests();
    await signOutAdmin("senha-alterada");
    expect(location.href).toBe("/painel/entrar?motivo=senha-alterada");
  });

  it("still leaves when the logout call fails", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await signOutAdmin();
    expect(location.href).toBe("/painel/entrar");
  });

  it("collapses concurrent calls into the first", async () => {
    await Promise.all([signOutAdmin("expirou"), signOutAdmin()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(location.href).toBe("/painel/entrar?motivo=expirou");
  });

  it("posts the logout only after a renewal in flight has settled, so its cookie can't land last", async () => {
    const order: string[] = [];
    let finishRenew!: () => void;
    const renew = startRenew(
      () =>
        new Promise<string>((resolve) => {
          finishRenew = () => {
            order.push("renew settled");
            resolve("renewed");
          };
        }),
      "skipped",
    );
    fetchMock.mockImplementation(async (url) => {
      order.push(String(url));
      return Response.json({ ok: true });
    });

    const leaving = signOutAdmin();
    await Promise.resolve();
    expect(order).toEqual([]);
    expect(location.href).toBe("/painel");

    finishRenew();
    await expect(renew).resolves.toBe("renewed");
    await leaving;
    expect(order).toEqual(["renew settled", "/api/admin/auth/logout"]);
    expect(location.href).toBe("/painel/entrar");
  });

  it("waits for a renewal that fails, too", async () => {
    void startRenew(() => Promise.reject(new Error("network")), "skipped").catch(() => undefined);
    await signOutAdmin();
    expect(location.href).toBe("/painel/entrar");
  });

  it("starts no renewal once a sign-out has begun", async () => {
    const start = vi.fn(async () => "renewed");
    void signOutAdmin();
    expect(isSigningOut()).toBe(true);
    await expect(startRenew(start, "skipped")).resolves.toBe("skipped");
    expect(start).not.toHaveBeenCalled();
  });
});
