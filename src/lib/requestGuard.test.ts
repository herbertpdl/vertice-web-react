import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { guardApiRequest, isJsonContentType, isSameOriginRequest } from "./requestGuard";

function request(method: string, headers: Record<string, string> = {}) {
  return new NextRequest("http://web.test/api/x", { method, headers });
}

describe("isSameOriginRequest", () => {
  it.each([
    ["same-origin fetch", "POST", { "Sec-Fetch-Site": "same-origin", Origin: "http://web.test" }],
    ["same-origin fetch, Host rewritten by a proxy", "POST", { "Sec-Fetch-Site": "same-origin", Origin: "https://app.example" }],
    ["typed URL / bookmark (GET)", "GET", { "Sec-Fetch-Site": "none" }],
    ["older browser, same host", "POST", { Origin: "http://web.test" }],
    ["older browser behind a TLS proxy (scheme differs, host matches)", "PATCH", { Origin: "https://web.test" }],
    ["GET with no Origin", "GET", {}],
    ["HEAD with no Origin", "HEAD", {}],
  ])("allows %s", (_label, method, headers) => {
    expect(isSameOriginRequest(request(method, headers))).toBe(true);
  });

  it.each([
    ["cross-site", "POST", { "Sec-Fetch-Site": "cross-site", Origin: "https://evil.example" }],
    ["same-site (sibling subdomain)", "POST", { "Sec-Fetch-Site": "same-site", Origin: "http://evil.web.test" }],
    ["cross-site GET", "GET", { "Sec-Fetch-Site": "cross-site" }],
    ["Sec-Fetch-Site none on a POST", "POST", { "Sec-Fetch-Site": "none" }],
    ["older browser, other host", "POST", { Origin: "https://evil.example" }],
    ["older browser, other port", "DELETE", { Origin: "http://web.test:8080" }],
    ["opaque origin", "POST", { Origin: "null" }],
    ["POST with no Origin", "POST", {}],
    ["PUT with no Origin", "PUT", {}],
    ["same-origin Sec-Fetch-Site but no Origin on a POST", "POST", { "Sec-Fetch-Site": "same-origin" }],
    ["DELETE with no Origin", "DELETE", {}],
  ])("refuses %s", (_label, method, headers) => {
    expect(isSameOriginRequest(request(method, headers))).toBe(false);
  });
});

describe("isJsonContentType", () => {
  it.each(["application/json", "application/json; charset=utf-8", "Application/JSON"])(
    "accepts %j",
    (value) => expect(isJsonContentType(value)).toBe(true),
  );
  it.each([null, "", "text/plain", "application/x-www-form-urlencoded", "multipart/form-data", "application/jsonx"])(
    "rejects %j",
    (value) => expect(isJsonContentType(value)).toBe(false),
  );
});

describe("guardApiRequest", () => {
  const sameOrigin = { "Sec-Fetch-Site": "same-origin", Origin: "http://web.test" };

  it("403s a cross-origin request before looking at the body", async () => {
    const res = guardApiRequest(
      request("POST", { "Sec-Fetch-Site": "cross-site", Origin: "https://evil.example", "Content-Type": "application/json" }),
      "json",
    );
    expect(res?.status).toBe(403);
    expect((await res!.json()).error.code).toBe("FORBIDDEN");
  });

  it("415s a non-JSON body on a JSON endpoint", async () => {
    const res = guardApiRequest(request("POST", { ...sameOrigin, "Content-Type": "text/plain" }), "json");
    expect(res?.status).toBe(415);
    expect((await res!.json()).error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("415s a JSON endpoint called with no Content-Type", () => {
    expect(guardApiRequest(request("POST", sameOrigin), "json")?.status).toBe(415);
  });

  it("lets a same-origin JSON request through", () => {
    expect(
      guardApiRequest(request("POST", { ...sameOrigin, "Content-Type": "application/json" }), "json"),
    ).toBeUndefined();
  });

  it("optional-json: allows no Content-Type, refuses a non-JSON one", () => {
    expect(guardApiRequest(request("DELETE", sameOrigin), "optional-json")).toBeUndefined();
    expect(
      guardApiRequest(request("POST", { ...sameOrigin, "Content-Type": "text/plain" }), "optional-json")?.status,
    ).toBe(415);
  });

  it("none: ignores the Content-Type", () => {
    expect(
      guardApiRequest(request("POST", { ...sameOrigin, "Content-Type": "text/plain" }), "none"),
    ).toBeUndefined();
  });
});
