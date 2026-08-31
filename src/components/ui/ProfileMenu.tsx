import { LogOut, Settings, User, type LucideIcon } from "lucide-react";

export interface ProfileMenuItem {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}

interface ProfileMenuProps {
  name: string;
  email: string;
  items?: ProfileMenuItem[];
  signOutItem?: ProfileMenuItem;
  className?: string;
}

const defaultItems: ProfileMenuItem[] = [
  { icon: User, label: "Editar perfil" },
  { icon: Settings, label: "Configurações" },
];

const defaultSignOutItem: ProfileMenuItem = { icon: LogOut, label: "Sair" };

function MenuRow({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: ProfileMenuItem & { danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-[10px] py-[9px] text-left text-[13px] transition-colors hover:bg-[var(--color-surface-hover)] ${
        danger ? "text-[var(--color-danger)]" : "text-[var(--color-text-primary)]"
      }`}
    >
      <Icon
        width={15}
        height={15}
        className={
          danger
            ? "text-[var(--color-danger)]"
            : "text-[var(--color-text-secondary)]"
        }
      />
      {label}
    </button>
  );
}

export function ProfileMenu({
  name,
  email,
  items = defaultItems,
  signOutItem = defaultSignOutItem,
  className = "",
}: ProfileMenuProps) {
  return (
    <div
      className={`font-base flex w-[220px] flex-col rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-[6px] ${className}`}
    >
      <div className="flex flex-col gap-[2px] px-[10px] pt-[10px] pb-[12px]">
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
          {name}
        </span>
        <span className="text-[11px] text-[var(--color-text-tertiary)]">
          {email}
        </span>
      </div>
      <div className="h-px w-full bg-[var(--color-border)]" />
      <div className="flex w-full flex-col gap-[2px] py-[6px]">
        {items.map((item) => (
          <MenuRow key={item.label} {...item} />
        ))}
      </div>
      <div className="h-px w-full bg-[var(--color-border)]" />
      <div className="flex w-full flex-col py-[6px]">
        <MenuRow {...signOutItem} danger />
      </div>
    </div>
  );
}
