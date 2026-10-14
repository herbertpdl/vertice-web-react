import { afterEach, describe, expect, it, vi } from "vitest";
import { checkBootConfig } from "./bootChecks";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("checkBootConfig", () => {
  it("exits with one log line when production lacks TRUSTED_PROXY_HOPS", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "");
    const exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    checkBootConfig();
    expect(exit).toHaveBeenCalledWith(1);
    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0][0]).toMatch(/^\[vertice\] TRUSTED_PROXY_HOPS must be set in production/);
  });

  it("passes with an explicit value", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
    const exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    checkBootConfig();
    expect(exit).not.toHaveBeenCalled();
  });
});
