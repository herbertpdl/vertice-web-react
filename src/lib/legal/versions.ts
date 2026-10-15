import type { Consent } from "@/lib/api/types";

/**
 * The versions of the legal texts this build ships (`/termos`, `/privacidade`, P1-04). They are
 * the drafts in `src/app/termos` and `src/app/privacidade`, pending legal review.
 *
 * Embedded rather than read from the BFF's `GET /legal/versions` on purpose: the texts live in
 * this repo, so the version the register form sends and the consent notice asks for is, by
 * construction, the version of the text the user could open. Keep these equal to vertice-bff's
 * `TERMS_VERSION` / `HEALTH_DATA_CONSENT_VERSION` (both `2026-10-draft` by default), which the
 * mobile app compares against: change a text here and bump the BFF env in the same release.
 */
export const LEGAL_VERSIONS = {
  terms: "2026-10-draft",
  healthData: "2026-10-draft",
} as const;

/** When the current drafts were written, shown under each page's title. */
export const LEGAL_TEXT_DATE = "14 de outubro de 2026";

/** True when the user has never accepted the Terms, or accepted a version other than `current`. */
export function needsTermsAcceptance(
  consent: Pick<Consent, "termsVersion"> | null | undefined,
  current: string = LEGAL_VERSIONS.terms,
): boolean {
  return consent?.termsVersion !== current;
}

/**
 * Placeholder until the owner picks the privacy contact (and the DPO, LGPD art. 41). Shown as-is
 * on the draft pages so nobody mistakes it for a real address.
 */
export const LEGAL_CONTACT_PLACEHOLDER = "[e-mail de contato a definir]";

/**
 * The texts whose embedded version differs from the BFF's `GET /legal/versions` (empty when they
 * agree). A difference means a text or the BFF env was bumped without the other, so web and
 * mobile would disagree on what "current" is.
 */
export function legalVersionsDrift(
  remote: { terms: string; healthData: string },
  embedded: { terms: string; healthData: string } = LEGAL_VERSIONS,
): string[] {
  return (["terms", "healthData"] as const)
    .filter((key) => remote[key] !== embedded[key])
    .map((key) => `${key}: web ${embedded[key]}, BFF ${remote[key]}`);
}
