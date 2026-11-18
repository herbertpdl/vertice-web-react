import type { Metadata } from "next";
import { AdminDashboardContent } from "./AdminDashboardContent";

export const metadata: Metadata = { title: "Dashboard — Painel Vertice" };

/** The admin dashboard (admin-panel spec §7; frames `En3Ju`, `rNMsp`, `qzCk9`). */
export default function AdminDashboardPage() {
  return <AdminDashboardContent />;
}
