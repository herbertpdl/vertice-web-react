import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchStudent, isMaskedCpf, revealStudentCpf, updateStudent } from "./students";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async () =>
    Response.json({ id: 4, name: "Ana", email: "ana@example.com", cpf: "529.982.247-25", role: "CLIENT" }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function sentBody() {
  return JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
}

describe("fetchStudent / revealStudentCpf", () => {
  it("asks for the masked CPF by default", async () => {
    await fetchStudent(4);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/bff/clients/4");
  });

  it("asks for the full CPF only through ?reveal=cpf, and returns just the CPF", async () => {
    await expect(revealStudentCpf(4)).resolves.toBe("529.982.247-25");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/bff/clients/4?reveal=cpf");
  });
});

describe("updateStudent", () => {
  it("never sends a masked CPF back", async () => {
    await updateStudent(4, { name: "Ana", email: "ana@example.com", cpf: "***.***.***-25" });
    expect(sentBody()).toEqual({ name: "Ana", email: "ana@example.com" });
  });

  it("sends a CPF the trainer typed", async () => {
    await updateStudent(4, { name: "Ana", email: "ana@example.com", cpf: "52998224725" });
    expect(sentBody()).toEqual({ name: "Ana", email: "ana@example.com", cpf: "52998224725" });
  });

  it("leaves the CPF out when none is given", async () => {
    await updateStudent(4, { name: "Ana", email: "ana@example.com" });
    expect(sentBody()).toEqual({ name: "Ana", email: "ana@example.com" });
  });
});

describe("isMaskedCpf", () => {
  it("tells the BFF's mask from a real CPF", () => {
    expect(isMaskedCpf("***.***.***-25")).toBe(true);
    expect(isMaskedCpf("529.982.247-25")).toBe(false);
    expect(isMaskedCpf("52998224725")).toBe(false);
  });
});
