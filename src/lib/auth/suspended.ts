/**
 * The BFF's 403 code for a correct password of a suspended account (PRD admin-panel R41, E18),
 * relayed as-is by the login routes. Local constants until VRT-29 takes the BFF types that name the
 * code and moves the copy into `errorMessages`.
 */
export const ACCOUNT_SUSPENDED_CODE = "ACCOUNT_SUSPENDED";

/** What a suspended account reads on a login page (R41). */
export const ACCOUNT_SUSPENDED_MESSAGE = "Sua conta está suspensa. Entre em contato com o suporte.";
