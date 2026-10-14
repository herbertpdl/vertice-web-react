import { describe, expect, it } from "vitest";
import { forwardedFor, resolveTrustedProxyHops, TrustedProxyHopsError } from "./forwardedFor";

describe("forwardedFor", () => {
  it("sends nothing when the request carries no address", () => {
    expect(forwardedFor(null, 0)).toBeUndefined();
    expect(forwardedFor("", 1)).toBeUndefined();
    expect(forwardedFor(" , ", 1)).toBeUndefined();
  });

  it("with no proxy, forwards the address Next filled in from the socket", () => {
    expect(forwardedFor("203.0.113.7", 0)).toBe("203.0.113.7");
  });

  it("behind one proxy, forwards only the address it appended", () => {
    // The browser claimed 198.51.100.1; the proxy appended what it saw.
    expect(forwardedFor("198.51.100.1, 203.0.113.7", 1)).toBe("203.0.113.7");
    expect(forwardedFor("203.0.113.7", 1)).toBe("203.0.113.7");
  });

  it("behind two proxies, forwards the address the outer proxy observed", () => {
    // Browser-supplied, then client (seen by the edge proxy), then the edge proxy (seen by nginx).
    expect(forwardedFor("198.51.100.1, 203.0.113.7, 10.0.0.2", 2)).toBe("203.0.113.7");
  });

  it("never forwards a browser-supplied entry behind a proxy", () => {
    const forwarded = forwardedFor("1.1.1.1, 2.2.2.2, 3.3.3.3, 203.0.113.7", 1);
    expect(forwarded).toBe("203.0.113.7");
  });

  it("uses the left-most entry when there are fewer entries than proxies", () => {
    expect(forwardedFor("203.0.113.7", 3)).toBe("203.0.113.7");
  });

  it("trims whitespace and empty entries", () => {
    expect(forwardedFor(" 198.51.100.1 ,, 2001:db8::1 ", 1)).toBe("2001:db8::1");
  });
});

describe("resolveTrustedProxyHops", () => {
  it("defaults to 0 outside production", () => {
    expect(resolveTrustedProxyHops({})).toBe(0);
    expect(resolveTrustedProxyHops({ NODE_ENV: "development", TRUSTED_PROXY_HOPS: "" })).toBe(0);
    expect(resolveTrustedProxyHops({ NODE_ENV: "test" })).toBe(0);
  });

  it("refuses to run unset in production (fails closed)", () => {
    expect(() => resolveTrustedProxyHops({ NODE_ENV: "production" })).toThrow(
      TrustedProxyHopsError,
    );
    expect(() =>
      resolveTrustedProxyHops({ NODE_ENV: "production", TRUSTED_PROXY_HOPS: "  " }),
    ).toThrow(/must be set in production/);
  });

  it("accepts an explicit 0 in production as a deliberate opt-in", () => {
    expect(resolveTrustedProxyHops({ NODE_ENV: "production", TRUSTED_PROXY_HOPS: "0" })).toBe(0);
  });

  it("parses a hop count", () => {
    expect(resolveTrustedProxyHops({ NODE_ENV: "production", TRUSTED_PROXY_HOPS: "2" })).toBe(2);
    expect(resolveTrustedProxyHops({ TRUSTED_PROXY_HOPS: " 1 " })).toBe(1);
  });

  it.each(["-1", "1.5", "abc", "true"])("refuses %s everywhere instead of reading 0", (value) => {
    expect(() => resolveTrustedProxyHops({ TRUSTED_PROXY_HOPS: value })).toThrow(
      /non-negative integer/,
    );
    expect(() =>
      resolveTrustedProxyHops({ NODE_ENV: "production", TRUSTED_PROXY_HOPS: value }),
    ).toThrow(TrustedProxyHopsError);
  });
});
