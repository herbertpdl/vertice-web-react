"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Header, type HeaderNavItem } from "../Header";
import type { Role } from "@/lib/api/types";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useSignOut } from "@/lib/auth/useSignOut";

/** Keyed by the contract's `Role`, so a member added or renamed in the spec fails typecheck. */
const ROLE_LABELS: Record<Role, string> = {
  TRAINER: "Treinador(a)",
  CLIENT: "Aluno(a)",
  ADMIN: "Admin",
};

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const handleSignOut = useSignOut();

  const navItems: HeaderNavItem[] = [
    { label: "Início", href: "/dashboard", active: pathname.startsWith("/dashboard") },
    { label: "Alunos", href: "/alunos", active: pathname.startsWith("/alunos") },
    { label: "Exercícios", href: "/exercicios", active: pathname.startsWith("/exercicios") },
  ];

  return (
    <Header
      navItems={navItems}
      user={{
        name: user?.name ?? "",
        email: user?.email ?? "",
        // The map is exhaustive over `Role`, so `??` only catches a role a BFF deployed ahead
        // of this build sends — the raw code reads better there than an empty line, the same
        // tolerance `apiErrorMessage` has for an unknown error code.
        role: user ? (ROLE_LABELS[user.role] ?? user.role) : "",
      }}
      // Every item does something: "Configurações" is gone until there are settings beyond the
      // profile (audit plan P1-06).
      profileMenuItems={[{ icon: User, label: "Editar perfil", onClick: () => router.push("/perfil") }]}
      profileSignOutItem={{ icon: LogOut, label: "Sair", onClick: handleSignOut }}
    />
  );
}
