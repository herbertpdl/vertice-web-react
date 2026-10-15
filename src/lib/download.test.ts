import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REVOKE_DELAY_MS, saveFile } from "./download";

const link = { href: "", download: "", style: { display: "" }, click: vi.fn(), remove: vi.fn() };
const createObjectURL = vi.fn(() => "blob:http://web.test/1");
const revokeObjectURL = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
  vi.stubGlobal("document", {
    createElement: vi.fn(() => link),
    body: { appendChild: vi.fn() },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("saveFile", () => {
  it("clicks an a[download] for the blob, then revokes the object URL", () => {
    const blob = new Blob(["{}"], { type: "application/json" });
    saveFile({ blob, filename: "vertice-dados-2026-10-15.json" });

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(link.href).toBe("blob:http://web.test/1");
    expect(link.download).toBe("vertice-dados-2026-10-15.json");
    expect(link.click).toHaveBeenCalledTimes(1);
    expect(link.remove).toHaveBeenCalledTimes(1);

    // Not right away: the browser may still be reading the URL.
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(REVOKE_DELAY_MS);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:http://web.test/1");
  });
});
