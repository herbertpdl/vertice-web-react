import { z } from "zod";
import { loginSchema } from "./auth";

// The admin workspace's form rules (admin-panel spec W15). VRT-26/29/32 add the reason, muscle
// group and search bounds here.

/** The authenticator code: exactly six digits (the BFF's `AdminVerifyRequest.code` pattern). */
export const secondFactorCodeSchema = z.string().regex(/^[0-9]{6}$/, "Digite os 6 dígitos do código");

/** The admin password step: the www login's fields, with no "remember me" (W6). */
export const adminLoginSchema = loginSchema.omit({ remember: true });

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

/** What the browser posts to `/api/admin/auth/verify`. The challenge stays in its cookie. */
export const adminVerifyRequestSchema = z.object({ code: secondFactorCodeSchema });
