import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AdminUnavailable } from "@/components/layout/AdminUnavailable";
import { adminSignInPath } from "@/lib/adminAuth/paths";
import { getAdminSessionToken } from "@/lib/adminSession";
import { workspaceOf } from "@/lib/host";
import { fetchMeOnServer } from "@/lib/serverMe";

/**
 * Every admin page's server-side role check, before any markup (admin-panel spec W4). The edge
 * proxy only knows a cookie exists; this asks the BFF who it belongs to. `redirect()` and
 * `notFound()` work by throwing, so they stay outside any try/catch (`fetchMeOnServer` never
 * throws).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The proxy already 404s `/painel` on www; this keeps the layout honest on its own.
  if (workspaceOf(await headers()) !== "admin") notFound();

  const token = await getAdminSessionToken();
  if (!token) redirect(adminSignInPath());

  const result = await fetchMeOnServer(token);
  if (result.kind === "unauthorized") redirect(adminSignInPath("expirou"));
  if (result.kind === "unavailable") return <AdminUnavailable />;
  if (result.kind === "forbidden" || result.me.role !== "ADMIN") notFound();

  return <div className="flex min-h-screen w-full flex-col bg-[var(--color-bg)]">{children}</div>;
}
