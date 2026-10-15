import type { Metadata } from "next";
import { ProfileContent } from "./ProfileContent";

export const metadata: Metadata = { title: "Meu perfil — Vertice" };

export default function ProfilePage() {
  return <ProfileContent />;
}
