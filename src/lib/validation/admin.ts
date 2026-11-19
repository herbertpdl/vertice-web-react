import { z } from "zod";
import { loginSchema } from "./auth";
import { MUSCLE_GROUP_NAME_MAX, REASON_MAX, tooLong } from "./bounds";

// The admin workspace's form rules (admin-panel spec W15). VRT-26/29/32 add the reason, muscle
// group and search bounds here.

/** The authenticator code: exactly six digits (the BFF's `AdminVerifyRequest.code` pattern). */
export const secondFactorCodeSchema = z.string().regex(/^[0-9]{6}$/, "Digite os 6 dígitos do código");

/** The admin password step: the www login's fields, with no "remember me" (W6). */
export const adminLoginSchema = loginSchema.omit({ remember: true });

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

/** What the browser posts to `/api/admin/auth/verify`. The challenge stays in its cookie. */
export const adminVerifyRequestSchema = z.object({ code: secondFactorCodeSchema });

/**
 * The "Motivo" of a suspension or reactivation (R39, E20): trimmed, then 1 to `REASON_MAX` UTF-16
 * units, the BFF's own rule. The bound applies to the trimmed text, so surrounding spaces never
 * refuse a reason the BFF would take. A `refine` on `.length`, not `.max()`: Zod 4's `.max()`
 * counts code points (an emoji is 1), looser than vertice-api's `String.length()` (2).
 */
export const adminReasonSchema = z
  .string()
  .trim()
  .min(1, "Informe o motivo")
  .refine((reason) => reason.length <= REASON_MAX, tooLong(REASON_MAX));

/**
 * A muscle group's name (R61, R62): trimmed, then 1 to `MUSCLE_GROUP_NAME_MAX` UTF-16 units, the
 * BFF's rule (it also NFC-normalizes). Bounded after the trim, like the reason.
 */
export const muscleGroupNameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome do grupo")
  .refine((name) => name.length <= MUSCLE_GROUP_NAME_MAX, tooLong(MUSCLE_GROUP_NAME_MAX));
