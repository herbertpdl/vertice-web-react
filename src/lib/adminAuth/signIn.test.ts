import { describe, expect, it } from "vitest";
import {
  challengeExpired,
  initialSignInState,
  manualEntryKey,
  signInReducer,
  type SignInEvent,
  type SignInState,
} from "./signIn";

const EXPIRES = "2026-11-18T12:05:00Z";

function run(events: SignInEvent[], from: SignInState = initialSignInState()): SignInState {
  return events.reduce(signInReducer, from);
}

const toEnroll: SignInEvent = { type: "loggedIn", secondFactor: "NOT_ENROLLED", challengeExpiresAt: EXPIRES };
const toCode: SignInEvent = { type: "loggedIn", secondFactor: "ENROLLED", challengeExpiresAt: EXPIRES };

describe("signInReducer", () => {
  it("starts at the password, with the expiry notice only when asked", () => {
    expect(initialSignInState()).toEqual({ step: "password", expired: false });
    expect(initialSignInState(true)).toEqual({ step: "password", expired: true });
  });

  it("goes from the password straight to the code when ENROLLED", () => {
    expect(run([toCode])).toEqual({ step: "code", challengeExpiresAt: EXPIRES });
  });

  it("goes from the password to the enrolment when NOT_ENROLLED, and shows the latest URI", () => {
    const state = run([toEnroll, { type: "enrollStarted", request: 1 }, { type: "enrolled", request: 1, provisioningUri: "otpauth://a" }]);
    expect(state).toMatchObject({ step: "enroll", provisioningUri: "otpauth://a", enrollRequest: 1 });
  });

  it("drops an out-of-order enroll answer: only the latest call's URI is ever shown", () => {
    const state = run([
      toEnroll,
      { type: "enrollStarted", request: 1 },
      { type: "enrollStarted", request: 2 },
      { type: "enrolled", request: 2, provisioningUri: "otpauth://new" },
      { type: "enrolled", request: 1, provisioningUri: "otpauth://stale" },
    ]);
    expect(state).toMatchObject({ provisioningUri: "otpauth://new" });
  });

  it("clears the shown URI while a new one is generated", () => {
    const state = run([
      toEnroll,
      { type: "enrollStarted", request: 1 },
      { type: "enrolled", request: 1, provisioningUri: "otpauth://a" },
      { type: "enrollStarted", request: 2 },
    ]);
    expect(state).toMatchObject({ step: "enroll", provisioningUri: undefined, enrollRequest: 2 });
  });

  it("moves to the code step on enroll 409 (already enrolled), but not for a stale call's 409", () => {
    const enrolling = run([toEnroll, { type: "enrollStarted", request: 1 }, { type: "enrollStarted", request: 2 }]);
    expect(signInReducer(enrolling, { type: "alreadyEnrolled", request: 1 })).toBe(enrolling);
    expect(signInReducer(enrolling, { type: "alreadyEnrolled", request: 2 })).toEqual({ step: "code", challengeExpiresAt: EXPIRES });
  });

  it("flags only the latest enroll failure", () => {
    const enrolling = run([toEnroll, { type: "enrollStarted", request: 3 }]);
    expect(signInReducer(enrolling, { type: "enrollFailed", request: 2 })).toBe(enrolling);
    expect(signInReducer(enrolling, { type: "enrollFailed", request: 3 })).toMatchObject({ enrollFailed: true });
  });

  it.each([
    ["code", [toCode]],
    ["enroll", [toEnroll, { type: "enrollStarted", request: 1 } as SignInEvent]],
  ])("a wrong code on the %s step shows \"Código inválido\" and keeps the step, cleared on edit", (step, events) => {
    const rejected = run([...events, { type: "codeRejected" }]);
    expect(rejected).toMatchObject({ step, codeError: "Código inválido", challengeExpiresAt: EXPIRES });
    expect(signInReducer(rejected, { type: "codeEdited" })).toMatchObject({ step, codeError: undefined });
  });

  it.each([
    ["the code step", [toCode]],
    ["the enrolment", [toEnroll]],
  ])("restarts from %s at the password with the expiry notice when the challenge ends", (_label, events) => {
    expect(run([...events, { type: "challengeEnded" }])).toEqual({ step: "password", expired: true });
  });

  it("goes back to the password with no notice on \"Voltar para o login\"", () => {
    expect(run([toCode, { type: "backToPassword" }])).toEqual({ step: "password", expired: false });
  });

  it("ignores events that don't belong to the current step", () => {
    const password = initialSignInState();
    for (const event of [
      { type: "enrollStarted", request: 1 },
      { type: "enrolled", request: 0, provisioningUri: "x" },
      { type: "codeRejected" },
      { type: "codeEdited" },
    ] as SignInEvent[]) {
      expect(signInReducer(password, event)).toBe(password);
    }
    const code = run([toCode]);
    expect(signInReducer(code, toEnroll)).toBe(code);
  });
});

describe("challengeExpired", () => {
  it("is true at and after the expiry, and for an unparsable one", () => {
    const at = Date.parse(EXPIRES);
    expect(challengeExpired(EXPIRES, at - 1)).toBe(false);
    expect(challengeExpired(EXPIRES, at)).toBe(true);
    expect(challengeExpired("nope", 0)).toBe(true);
  });
});

describe("manualEntryKey", () => {
  it("groups the secret in fours", () => {
    expect(manualEntryKey("otpauth://totp/Vertice:carla?secret=JBSWY3DPEHPK3PXP&issuer=Vertice")).toBe("JBSW Y3DP EHPK 3PXP");
    expect(manualEntryKey("otpauth://totp/x?secret=abcdefghij")).toBe("ABCD EFGH IJ");
  });

  it.each(["otpauth://totp/x", "not a uri", "otpauth://totp/x?secret="])("is undefined for %s", (uri) => {
    expect(manualEntryKey(uri)).toBeUndefined();
  });
});
