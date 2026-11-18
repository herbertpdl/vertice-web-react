import "server-only";
import { cookies } from "next/headers";
import { adminSessionCookieName } from "./adminCookies";
import { serverEnv } from "./env.server";

// The admin workspace's cookies (admin-panel spec W6), as `session.ts` is for `vertice_session`.
// This is the one module that reads or writes them. Only the admin host's handlers call it.

/** The admin JWT from `__Host-vertice_admin` (`vertice_admin` outside production), if any. */
export async function getAdminSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(adminSessionCookieName(serverEnv().isProduction))?.value;
}
