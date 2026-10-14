import { describe, expect, it } from "vitest";
import { forwardedFor } from "./forwardedFor";

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
