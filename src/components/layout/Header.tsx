"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { ProfileMenu, type ProfileMenuItem } from "@/components/ui/ProfileMenu";

export interface HeaderNavItem {
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
}

interface HeaderProps {
  logoText?: string;
  navItems: HeaderNavItem[];
  user: {
    name: string;
    email: string;
    role: string;
  };
  profileMenuItems?: ProfileMenuItem[];
  profileSignOutItem?: ProfileMenuItem;
  className?: string;
}

export function Header({
  logoText = "Vertice",
  navItems,
  user,
  profileMenuItems,
  profileSignOutItem,
  className = "",
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <header
      className={`font-base flex w-full items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)] px-[var(--space-6)] py-[var(--space-4)] ${className}`}
    >
      <div className="flex items-center gap-[var(--space-8)]">
        <div className="flex items-center gap-2">
          <Image src="/logo-mark.png" alt="" width={28} height={28} priority />
          <span className="font-heading text-[length:var(--text-lg)] font-semibold text-[color:var(--color-text-primary)]">
            {logoText}
          </span>
        </div>
        <nav className="flex items-center gap-[var(--space-6)]">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href ?? "#"}
              onClick={item.onClick}
              className={`text-[length:var(--text-base)] ${
                item.active
                  ? "font-semibold text-[color:var(--color-primary)]"
                  : "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div
        ref={containerRef}
        className="relative flex items-center gap-[var(--space-4)]"
        onBlur={(event) => {
          if (!containerRef.current?.contains(event.relatedTarget)) {
            setMenuOpen(false);
          }
        }}
      >
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-[10px] py-[6px]"
        >
          <span className="h-[30px] w-[30px] rounded-full bg-[var(--color-secondary)]" />
          <span className="flex flex-col items-start">
            <span className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">
              {user.name}
            </span>
            <span className="text-[11px] text-[color:var(--color-text-tertiary)]">
              {user.role}
            </span>
          </span>
          <ChevronDown
            width={16}
            height={16}
            className={`text-[color:var(--color-text-secondary)] transition-transform ${
              menuOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {menuOpen && (
          <div className="absolute top-full right-0 z-20 mt-[8px]">
            <ProfileMenu
              name={user.name}
              email={user.email}
              items={profileMenuItems}
              signOutItem={profileSignOutItem}
            />
          </div>
        )}
      </div>
    </header>
  );
}
