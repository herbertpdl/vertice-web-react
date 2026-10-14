import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_BFF_URL,
  parseServerEnv,
  resetServerEnvForTests,
  serverEnv,
  ServerEnvError,
} from "./env.server";

afterEach(() => {
  vi.unstubAllEnvs();
  resetServerEnvForTests();
});

describe("parseServerEnv", () => {
  it("applies the dev defaults", () => {
    expect(parseServerEnv({})).toEqual({
      nodeEnv: undefined,
      isProduction: false,
      bffUrl: DEFAULT_BFF_URL,
      trustedProxyHops: 0,
    });
    expect(parseServerEnv({ BFF_URL: "  " }).bffUrl).toBe(DEFAULT_BFF_URL);
  });

  it("reads BFF_URL and drops a trailing slash", () => {
    expect(parseServerEnv({ BFF_URL: "https://bff.example.com/" }).bffUrl).toBe(
      "https://bff.example.com",
    );
    expect(parseServerEnv({ BFF_URL: "http://10.0.0.5:3000" }).bffUrl).toBe("http://10.0.0.5:3000");
  });

  it.each(["not a url", "bff:3000", "ftp://bff.example.com"])("refuses BFF_URL %s", (value) => {
    expect(() => parseServerEnv({ BFF_URL: value })).toThrow(ServerEnvError);
    expect(() => parseServerEnv({ BFF_URL: value })).toThrow(/BFF_URL must be an http\(s\) URL/);
  });

  it("flags production only for NODE_ENV=production", () => {
    expect(parseServerEnv({ NODE_ENV: "production", TRUSTED_PROXY_HOPS: "1" }).isProduction).toBe(
      true,
    );
    expect(parseServerEnv({ NODE_ENV: "development" }).isProduction).toBe(false);
    expect(parseServerEnv({ NODE_ENV: "test" }).isProduction).toBe(false);
  });

  describe("TRUSTED_PROXY_HOPS", () => {
    it("defaults to 0 outside production", () => {
      expect(parseServerEnv({}).trustedProxyHops).toBe(0);
      expect(
        parseServerEnv({ NODE_ENV: "development", TRUSTED_PROXY_HOPS: "" }).trustedProxyHops,
      ).toBe(0);
      expect(parseServerEnv({ NODE_ENV: "test" }).trustedProxyHops).toBe(0);
    });

    it("refuses to run unset in production (fails closed)", () => {
      expect(() => parseServerEnv({ NODE_ENV: "production" })).toThrow(ServerEnvError);
      expect(() => parseServerEnv({ NODE_ENV: "production", TRUSTED_PROXY_HOPS: "  " })).toThrow(
        /^TRUSTED_PROXY_HOPS must be set in production/,
      );
    });

    it("accepts an explicit 0 in production as a deliberate opt-in", () => {
      expect(
        parseServerEnv({ NODE_ENV: "production", TRUSTED_PROXY_HOPS: "0" }).trustedProxyHops,
      ).toBe(0);
    });

    it("parses a hop count", () => {
      expect(
        parseServerEnv({ NODE_ENV: "production", TRUSTED_PROXY_HOPS: "2" }).trustedProxyHops,
      ).toBe(2);
      expect(parseServerEnv({ TRUSTED_PROXY_HOPS: " 1 " }).trustedProxyHops).toBe(1);
    });

    it.each(["-1", "1.5", "abc", "true"])("refuses %s everywhere instead of reading 0", (value) => {
      expect(() => parseServerEnv({ TRUSTED_PROXY_HOPS: value })).toThrow(
        `TRUSTED_PROXY_HOPS must be a non-negative integer, got "${value}"`,
      );
      expect(() => parseServerEnv({ NODE_ENV: "production", TRUSTED_PROXY_HOPS: value })).toThrow(
        ServerEnvError,
      );
    });
  });

  it("names every invalid variable in one error", () => {
    expect(() => parseServerEnv({ BFF_URL: "nope", TRUSTED_PROXY_HOPS: "x" })).toThrow(
      /BFF_URL must be an http\(s\) URL.*; TRUSTED_PROXY_HOPS must be a non-negative integer/,
    );
  });
});

describe("serverEnv", () => {
  it("parses process.env once", () => {
    vi.stubEnv("BFF_URL", "http://first.test");
    expect(serverEnv().bffUrl).toBe("http://first.test");
    vi.stubEnv("BFF_URL", "http://second.test");
    expect(serverEnv().bffUrl).toBe("http://first.test");
    resetServerEnvForTests();
    expect(serverEnv().bffUrl).toBe("http://second.test");
  });

  it("does not cache an invalid config", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "");
    expect(() => serverEnv()).toThrow(/TRUSTED_PROXY_HOPS must be set in production/);
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
    expect(serverEnv().trustedProxyHops).toBe(1);
  });
});
