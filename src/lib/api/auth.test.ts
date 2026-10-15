import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAccount, exportMyData, updateMe } from "./auth";
import { ApiError, attachmentFilename } from "./client";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function sent() {
  const [url, init] = fetchMock.mock.calls[0];
  return { url, method: init!.method, body: init!.body ? JSON.parse(init!.body as string) : undefined };
}

describe("updateMe", () => {
  beforeEach(() => {
    fetchMock.mockImplementation(async () => Response.json({ id: 1, name: "Ana" }));
  });

  it("never sends a masked CPF back", async () => {
    await updateMe({ name: "Ana", cpf: "***.***.***-25" });
    expect(sent()).toEqual({ url: "/api/bff/auth/me", method: "PATCH", body: { name: "Ana" } });
  });

  it("sends a CPF the user typed, and only the fields given", async () => {
    await updateMe({ cpf: "52998224725" });
    expect(sent().body).toEqual({ cpf: "52998224725" });
  });

  it("sends a null cref (cleared)", async () => {
    await updateMe({ cref: null });
    expect(sent().body).toEqual({ cref: null });
  });
});

describe("deleteAccount", () => {
  it("sends DELETE /auth/me with the password as JSON", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await deleteAccount("s3nha-atual");
    expect(sent()).toEqual({
      url: "/api/bff/auth/me",
      method: "DELETE",
      body: { password: "s3nha-atual" },
    });
    expect((fetchMock.mock.calls[0][1]!.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
  });

  it("throws INVALID_CURRENT_PASSWORD as an ApiError", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code: "INVALID_CURRENT_PASSWORD", message: "Current password is incorrect" } },
        { status: 400 },
      ),
    );
    await expect(deleteAccount("errada")).rejects.toMatchObject({
      code: "INVALID_CURRENT_PASSWORD",
      status: 400,
    });
  });
});

describe("exportMyData", () => {
  it("returns the file with the name from Content-Disposition", async () => {
    fetchMock.mockResolvedValue(
      new Response('{"formatVersion":1}', {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": 'attachment; filename="vertice-dados-2026-10-15.json"',
        },
      }),
    );
    const file = await exportMyData();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/bff/auth/me/export");
    expect(file.filename).toBe("vertice-dados-2026-10-15.json");
    expect(await file.blob.text()).toBe('{"formatVersion":1}');
  });

  it("falls back to a fixed name without Content-Disposition", async () => {
    fetchMock.mockResolvedValue(new Response("{}"));
    expect((await exportMyData()).filename).toBe("vertice-dados.json");
  });

  it("throws 429 with retryAfter", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests" } },
        { status: 429, headers: { "Retry-After": "1800" } },
      ),
    );
    const error = await exportMyData().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "RATE_LIMITED", status: 429, retryAfter: 1800 });
  });

  it("throws 413 TOO_LARGE", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: { code: "TOO_LARGE", message: "Too large" } }, { status: 413 }),
    );
    await expect(exportMyData()).rejects.toMatchObject({ code: "TOO_LARGE", status: 413 });
  });
});

describe("attachmentFilename", () => {
  it.each([
    ['attachment; filename="vertice-dados-2026-10-15.json"', "vertice-dados-2026-10-15.json"],
    ["attachment; filename=dados.json", "dados.json"],
    ['attachment; filename="../../etc/passwd"', undefined],
    ['attachment; filename="dados..json"', undefined],
    ['attachment; filename=".bashrc"', undefined],
    ['attachment; filename="meus dados.json"', undefined],
    ['attachment; filename="C:\\dados.json"', undefined],
    ["attachment", undefined],
    [null, undefined],
  ])("reads %s as %s", (header, expected) => {
    expect(attachmentFilename(header)).toBe(expected);
  });
});
