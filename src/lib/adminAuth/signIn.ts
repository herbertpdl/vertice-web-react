import type { SecondFactor } from "@/lib/api/types";

// The admin sign-in's steps (admin-panel spec W7, W10, §4) as a pure reducer, so every
// transition is unit-tested and the screen only maps events to it:
//
//   password ─login 200, ENROLLED─────────────▶ code ─verify 200─▶ (hard navigation)
//      │     ─login 200, NOT_ENROLLED─▶ enroll ─verify 200─┘
//      │                                │ enroll 409 (already enrolled) ─▶ code
//      ◀── CHALLENGE_INVALID, verify 409, challenge expired at submit: restart with the notice
//      ◀── "Voltar para o login": restart
//
// The steps live only in component state: a reload starts again at the password, and the
// provisioning URI (a secret) is never put in a URL, storage or a log (BFF B14).

/** Shown on the password step after a restart, and on `?motivo=expirou` (frame `cb0r1`). */
export const SESSION_EXPIRED_MESSAGE = "Sua sessão expirou. Entre novamente.";

/** Shown on the password step after the admin's own password change (E42; the mobile app's copy). */
export const PASSWORD_CHANGED_MESSAGE = "Senha alterada. Entre com a nova senha.";

/** The footnote under the expiry notice. */
export const SESSION_LIMITS_HELP =
  "Por segurança, a sessão termina após 30 minutos sem uso ou 12 horas depois do login.";

/** The code step's error for 400 INVALID_SECOND_FACTOR_CODE (frames `p5TLVn`, `q9XrXD`). */
export const INVALID_CODE_MESSAGE = "Código inválido";

export type SignInState =
  | { step: "password"; expired: boolean }
  | {
      step: "enroll";
      /** When the challenge ends, on this browser's clock (ms). */
      challengeDeadline: number;
      /** The id of the latest enroll call; an answer to any other is dropped. */
      enrollRequest: number;
      /** `undefined` while the latest call is in flight. */
      provisioningUri?: string;
      enrollFailed: boolean;
      codeError?: string;
    }
  | { step: "code"; challengeDeadline: number; codeError?: string };

export type SignInEvent =
  | { type: "loggedIn"; secondFactor: SecondFactor; challengeDeadline: number }
  /** An enroll call starts (from the login handler or "Gerar novo QR", never from an effect). */
  | { type: "enrollStarted"; request: number }
  | { type: "enrolled"; request: number; provisioningUri: string }
  /** 409 PRECONDITION_FAILED at enroll: an authenticator is already set up. */
  | { type: "alreadyEnrolled"; request: number }
  | { type: "enrollFailed"; request: number }
  | { type: "codeRejected" }
  | { type: "codeEdited" }
  /** CHALLENGE_INVALID, verify 409, or a challenge past its deadline at submit. */
  | { type: "challengeEnded" }
  /** "Voltar para o login". */
  | { type: "backToPassword" };

export function initialSignInState(expired = false): SignInState {
  return { step: "password", expired };
}

export function signInReducer(state: SignInState, event: SignInEvent): SignInState {
  switch (event.type) {
    case "loggedIn":
      if (state.step !== "password") return state;
      return event.secondFactor === "ENROLLED"
        ? { step: "code", challengeDeadline: event.challengeDeadline }
        : {
            step: "enroll",
            challengeDeadline: event.challengeDeadline,
            enrollRequest: 0,
            enrollFailed: false,
          };
    case "enrollStarted":
      if (state.step !== "enroll") return state;
      return { ...state, enrollRequest: event.request, provisioningUri: undefined, enrollFailed: false };
    case "enrolled":
      if (state.step !== "enroll" || event.request !== state.enrollRequest) return state;
      return { ...state, provisioningUri: event.provisioningUri, enrollFailed: false };
    case "alreadyEnrolled":
      if (state.step !== "enroll" || event.request !== state.enrollRequest) return state;
      return { step: "code", challengeDeadline: state.challengeDeadline };
    case "enrollFailed":
      if (state.step !== "enroll" || event.request !== state.enrollRequest) return state;
      return { ...state, enrollFailed: true };
    case "codeRejected":
      if (state.step === "password") return state;
      return { ...state, codeError: INVALID_CODE_MESSAGE };
    case "codeEdited":
      if (state.step === "password" || state.codeError === undefined) return state;
      return { ...state, codeError: undefined };
    case "challengeEnded":
      return { step: "password", expired: true };
    case "backToPassword":
      return { step: "password", expired: false };
  }
}

/**
 * Whether the challenge is past its deadline at `now` (a submit then restarts instead of posting).
 * Both on this browser's clock: the deadline was set from the seconds the server counted.
 */
export function challengeExpired(challengeDeadline: number, now: number = Date.now()): boolean {
  return Number.isNaN(challengeDeadline) || now >= challengeDeadline;
}

/**
 * The `secret` of an `otpauth://` URI in groups of four ("JBSW Y3DP EHPK 3PXP"), for typing it by
 * hand, or `undefined` when there is none.
 */
export function manualEntryKey(provisioningUri: string): string | undefined {
  let secret: string | null;
  try {
    secret = new URL(provisioningUri).searchParams.get("secret");
  } catch {
    return undefined;
  }
  const clean = secret?.replace(/\s/g, "").toUpperCase();
  return clean ? (clean.match(/.{1,4}/g) ?? []).join(" ") : undefined;
}
