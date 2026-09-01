"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut, Settings, User } from "lucide-react";
import { Header, type HeaderNavItem } from "./Header";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { logout } from "@/lib/api/auth";
import { useQueryClient } from "@tanstack/react-query";

const ROLE_LABELS: Record<string, string> = {
  TRAINER: "Treinador(a)",
  CLIENT: "Aluno(a)",
  ADMIN: "Admin",
};

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  const navItems: HeaderNavItem[] = [
    { label: "Início", href: "/dashboard", active: pathname.startsWith("/dashboard") },
    { label: "Alunos", href: "/alunos", active: pathname.startsWith("/alunos") },
    { label: "Exercícios", href: "/exercicios", active: pathname.startsWith("/exercicios") },
  ];

  async function handleSignOut() {
    await logout();
    queryClient.clear();
    router.push("/login");
    router.refresh();
  }

  return (
    <Header
      navItems={navItems}
      user={{
        name: user?.name ?? "",
        email: user?.email ?? "",
        role: user ? (ROLE_LABELS[user.role] ?? user.role) : "",
      }}
      profileMenuItems={[
        { icon: User, label: "Editar perfil" },
        { icon: Settings, label: "Configurações" },
      ]}
      profileSignOutItem={{ icon: LogOut, label: "Sair", onClick: handleSignOut }}
    />
  );
}
