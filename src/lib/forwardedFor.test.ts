import { describe, expect, it } from "vitest";
import { forwardedFor, parseTrustedProxyHops } from "./forwardedFor";

describe("forwardedFor", () => {
  it("sends nothing when the request carries no address", () => {
    expect(forwardedFor(null, 0)).toBeUndefined();
    expect(forwardedFor("", 1)).toBeUndefined();
    expect(forwardedFor(" , ", 1)).toBeUndefined();
  });

  it("with no proxy, forwards the address Next filled in from the socket", () => {
    expect(forwardedFor("203.0.113.7", 0)).toBe("203.0.113.7");
  });

  it("behind one proxy, keeps the address it appended as the right-most entry", () => {
    // The browser claimed 198.51.100.1; the proxy appended what it saw.
    expect(forwardedFor("198.51.100.1, 203.0.113.7", 1)).toBe("198.51.100.1, 203.0.113.7");
    expect(forwardedFor("203.0.113.7", 1)).toBe("203.0.113.7");
  });

  it("behind two proxies, drops the inner proxy's peer so the client is right-most", () => {
    // Browser-supplied, then client (seen by the edge proxy), then the edge proxy (seen by nginx).
    expect(forwardedFor("198.51.100.1, 203.0.113.7, 10.0.0.2", 2)).toBe(
      "198.51.100.1, 203.0.113.7",
    );
  });

  it("never lets a browser-supplied entry end up right-most behind a proxy", () => {
    const browserForged = "1.1.1.1, 2.2.2.2, 3.3.3.3";
    const atProxy = `${browserForged}, 203.0.113.7`;
    const forwarded = forwardedFor(atProxy, 1)!;
    expect(forwarded.split(", ").at(-1)).toBe("203.0.113.7");
  });

  it("uses the left-most entry when there are fewer entries than proxies", () => {
    expect(forwardedFor("203.0.113.7", 3)).toBe("203.0.113.7");
  });

  it("trims whitespace and empty entries", () => {
    expect(forwardedFor(" 198.51.100.1 ,, 2001:db8::1 ", 1)).toBe("198.51.100.1, 2001:db8::1");
  });
});

describe("parseTrustedProxyHops", () => {
  it("defaults to 0 when unset or not a non-negative integer", () => {
    expect(parseTrustedProxyHops(undefined)).toBe(0);
    expect(parseTrustedProxyHops("")).toBe(0);
    expect(parseTrustedProxyHops("-1")).toBe(0);
    expect(parseTrustedProxyHops("1.5")).toBe(0);
    expect(parseTrustedProxyHops("abc")).toBe(0);
  });

  it("parses a hop count", () => {
    expect(parseTrustedProxyHops("0")).toBe(0);
    expect(parseTrustedProxyHops("2")).toBe(2);
  });
});
