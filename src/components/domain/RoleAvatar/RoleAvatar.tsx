import { initialsOf } from "@/components/ui";
import type { AdminDirectoryRole } from "@/lib/api/types";

const roleColors: Record<AdminDirectoryRole, string> = {
  TRAINER: "bg-[var(--color-info)] text-[#04141A]",
  CLIENT: "bg-[var(--color-secondary)] text-[#F2F6FA]",
};

const sizes = {
  sm: "h-[32px] w-[32px] text-[11px]",
  lg: "h-[56px] w-[56px] text-[18px]",
} as const;

/**
 * Initials on the role's color, as the admin frames draw people (`ETgH1` rows at 32 px, the
 * profile head of `M3SiW` / `eUOyS` at 56 px): trainers on `$color-info`, clients on
 * `$color-secondary`. Decorative: the name is always next to it.
 */
export function RoleAvatar({
  name,
  role,
  size = "sm",
}: {
  name: string;
  role: AdminDirectoryRole;
  size?: keyof typeof sizes;
}) {
  return (
    <span
      aria-hidden="true"
      className={`font-base flex shrink-0 items-center justify-center rounded-[var(--radius-full)] font-bold ${roleColors[role]} ${sizes[size]}`}
    >
      {initialsOf(name)}
    </span>
  );
}
