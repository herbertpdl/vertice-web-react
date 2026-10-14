import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, createNonce } from "./csp";

function directives(policy: string): Map<string, string> {
  return new Map(
    policy.split(";").map((part) => {
      const [name, ...values] = part.trim().split(/\s+/);
      return [name, values.join(" ")];
    }),
  );
}

describe("createNonce", () => {
  it("is 128 random bits, base64, fresh each time", () => {
    const a = createNonce();
    expect(atob(a)).toHaveLength(16);
    expect(createNonce()).not.toBe(a);
  });
});

describe("buildContentSecurityPolicy", () => {
  it("production: nonce + strict-dynamic for scripts, no unsafe-eval or unsafe-inline scripts", () => {
    const csp = directives(buildContentSecurityPolicy("abc", { dev: false }));
    expect(csp.get("script-src")).toBe("'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp.get("style-src")).toBe("'self' 'nonce-abc'");
    expect(csp.get("default-src")).toBe("'self'");
    expect(csp.get("object-src")).toBe("'none'");
    expect(csp.get("base-uri")).toBe("'self'");
    expect(csp.get("frame-ancestors")).toBe("'none'");
    expect(csp.get("form-action")).toBe("'self'");
  });

  it("dev: adds what next dev needs", () => {
    const csp = directives(buildContentSecurityPolicy("abc", { dev: true }));
    expect(csp.get("script-src")).toBe("'self' 'nonce-abc' 'strict-dynamic' 'unsafe-eval'");
    expect(csp.get("style-src")).toBe("'self' 'unsafe-inline'");
  });
});
