"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
}

export type DropdownSize = "md" | "compact";

interface DropdownProps {
  label?: string;
  placeholder?: string;
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  size?: DropdownSize;
  className?: string;
}

type MenuPlacement = "bottom" | "top";

interface MenuPosition {
  top: number;
  left: number;
  width: number;
  placement: MenuPlacement;
}

const sizeStyles: Record<
  DropdownSize,
  {
    trigger: string;
    triggerRadius: string;
    triggerRadiusOpen: Record<MenuPlacement, string>;
    menuRadius: Record<MenuPlacement, string>;
    menuBg: string;
    chevronSize: number;
  }
> = {
  md: {
    trigger:
      "px-[14px] py-[10px] text-[length:var(--text-base)] bg-[var(--color-surface)]",
    triggerRadius: "rounded-[var(--radius-md)]",
    triggerRadiusOpen: {
      bottom: "rounded-t-[var(--radius-md)]",
      top: "rounded-b-[var(--radius-md)]",
    },
    menuRadius: {
      bottom: "rounded-b-[var(--radius-md)] border-t-0",
      top: "rounded-t-[var(--radius-md)] border-b-0",
    },
    menuBg: "bg-[var(--color-surface)]",
    chevronSize: 16,
  },
  compact: {
    trigger:
      "px-[10px] py-[7px] text-[length:var(--text-xs)] bg-[var(--color-bg)]",
    triggerRadius: "rounded-[var(--radius-sm)]",
    triggerRadiusOpen: {
      bottom: "rounded-t-[var(--radius-sm)]",
      top: "rounded-b-[var(--radius-sm)]",
    },
    menuRadius: {
      bottom: "rounded-b-[var(--radius-sm)] border-t-0",
      top: "rounded-t-[var(--radius-sm)] border-b-0",
    },
    menuBg: "bg-[var(--color-bg)]",
    chevronSize: 14,
  },
};

const OPTION_SELECTOR = '[role="option"]';

function getOptionElements(menu: HTMLElement | null) {
  return Array.from(menu?.querySelectorAll<HTMLElement>(OPTION_SELECTOR) ?? []);
}

export function Dropdown({
  label,
  placeholder = "Select an option",
  options,
  value,
  onChange,
  disabled,
  size = "md",
  className = "",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  // Set when the menu is opened from the keyboard so the first render of the
  // menu moves focus into it (mouse users keep focus on the trigger).
  const focusMenuOnOpenRef = useRef(false);
  const selected = options.find((option) => option.value === value);
  const styles = sizeStyles[size];
  const placement = menuPosition?.placement ?? "bottom";

  // The menu is portaled to <body> and positioned `fixed` from the trigger's
  // rect, so it's never clipped by (or scrolls inside) an `overflow` ancestor
  // such as a Dialog panel. Measured in a layout effect so there's no flash at
  // (0,0) before the first paint; re-measured on resize and on any scroll.
  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const rect = trigger.getBoundingClientRect();
      const menuHeight = menu.offsetHeight;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placement: MenuPlacement =
        menuHeight > spaceBelow && rect.top > spaceBelow ? "top" : "bottom";
      setMenuPosition({
        left: rect.left,
        width: rect.width,
        top: placement === "bottom" ? rect.bottom : rect.top - menuHeight,
        placement,
      });
    }

    updatePosition();
    if (focusMenuOnOpenRef.current) {
      focusMenuOnOpenRef.current = false;
      const items = getOptionElements(menuRef.current);
      (items.find((item) => item.getAttribute("aria-selected") === "true") ?? items[0])?.focus();
    }

    window.addEventListener("resize", updatePosition);
    // Capture phase so scrolling inside any ancestor (not just the window)
    // repositions the menu.
    document.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
      setMenuPosition(null);
    };
  }, [open]);

  // Outside clicks: the menu isn't a DOM descendant of the container, so check
  // both refs.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function close({ focusTrigger = false } = {}) {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }

  function openFromKeyboard() {
    focusMenuOnOpenRef.current = true;
    setOpen(true);
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (open) {
        getOptionElements(menuRef.current)[0]?.focus();
      } else {
        openFromKeyboard();
      }
    }
  }

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    const items = getOptionElements(menuRef.current);
    const index = items.indexOf(document.activeElement as HTMLElement);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        items[(index + 1) % items.length]?.focus();
        break;
      case "ArrowUp":
        event.preventDefault();
        items[(index - 1 + items.length) % items.length]?.focus();
        break;
      case "Home":
        event.preventDefault();
        items[0]?.focus();
        break;
      case "End":
        event.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case "Tab":
        // Focus is inside the portal at the end of <body>; move it back to the
        // trigger first so the default Tab continues from there.
        close({ focusTrigger: true });
        break;
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && open) {
      // Mark the Escape as handled so an enclosing Dialog (which listens on
      // `document`, the same node React dispatches from under the App Router,
      // so `stopPropagation` alone can't reach it) doesn't also close itself.
      event.preventDefault();
      event.stopPropagation();
      close({ focusTrigger: true });
    }
  }

  function handleBlur(event: React.FocusEvent<HTMLElement>) {
    const next = event.relatedTarget as Node | null;
    if (containerRef.current?.contains(next) || menuRef.current?.contains(next)) return;
    setOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className={`font-base relative flex flex-col gap-[6px] ${
        disabled ? "opacity-35" : ""
      } ${className}`}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label
          htmlFor={id}
          className="text-[length:var(--text-xs)] font-semibold text-[color:var(--color-text-secondary)]"
        >
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-listbox` : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        className={`flex w-full items-center justify-between gap-2 border ${styles.trigger} transition-colors ${
          open
            ? `${styles.triggerRadiusOpen[placement]} border-[var(--color-primary)]`
            : `${styles.triggerRadius} border-[var(--color-border)]`
        }`}
      >
        <span
          className={
            selected
              ? "text-[color:var(--color-text-primary)]"
              : "text-[color:var(--color-text-tertiary)]"
          }
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          width={styles.chevronSize}
          height={styles.chevronSize}
          className={`text-[color:var(--color-text-secondary)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open &&
        createPortal(
          <ul
            ref={menuRef}
            id={`${id}-listbox`}
            role="listbox"
            aria-labelledby={id}
            style={{
              top: menuPosition?.top,
              left: menuPosition?.left,
              width: menuPosition?.width,
              visibility: menuPosition ? "visible" : "hidden",
            }}
            // Keep focus on the trigger when clicking an option, so the
            // container's blur handler doesn't close the menu before `click`.
            onMouseDown={(event) => event.preventDefault()}
            onKeyDown={handleMenuKeyDown}
            className={`font-base fixed z-[60] flex flex-col gap-0 ${styles.menuRadius[placement]} border border-[var(--color-border)] ${styles.menuBg} p-[6px]`}
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    onClick={() => {
                      onChange?.(option.value);
                      close({ focusTrigger: true });
                    }}
                    className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-[10px] py-[9px] text-left text-[length:var(--text-base)] hover:bg-[var(--color-surface-hover)] focus-visible:bg-[var(--color-surface-hover)] focus-visible:outline-none ${
                      isSelected
                        ? "bg-[var(--color-surface-hover)] text-[color:var(--color-primary)]"
                        : "text-[color:var(--color-text-primary)]"
                    }`}
                  >
                    {option.label}
                    {isSelected && <Check width={14} height={14} />}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
