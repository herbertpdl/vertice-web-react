import { describe, expect, it } from "vitest";
import { appLoginLink, storeFor } from "./appLinks";

describe("storeFor", () => {
  it.each([
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15", "app-store"],
    ["Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15", "app-store"],
    ["Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0 Mobile", "play-store"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15", null],
    ["", null],
  ])("%s → %s", (userAgent, store) => {
    expect(storeFor(userAgent)).toBe(store);
  });
});

describe("appLoginLink", () => {
  it("opens the app's login with the email percent-encoded", () => {
    expect(appLoginLink("bia+treino@example.com")).toBe("verticemobile://login?email=bia%2Btreino%40example.com");
  });
});
