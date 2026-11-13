"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label?: string;
  placeholder?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

type MenuPlacement = "bottom" | "top";

interface MenuPosition {
  top: number;
  left: number;
  width: number;
  placement: MenuPlacement;
}

const OPTION_SELECTOR = '[role="option"]';

function getOptionElements(menu: HTMLElement | null) {
  return Array.from(menu?.querySelectorAll<HTMLElement>(OPTION_SELECTOR) ?? []);
}

/**
 * A multi-value listbox popover. The selection is shown as removable tags
 * between the label and the trigger (derived from `value`, in option order);
 * the trigger itself always shows the placeholder.
 * Same floating mechanics as `Dropdown` (portal
 * to <body>, `fixed` from the trigger's rect, flip above, `z-[60]`), but an
 * option click toggles it and keeps the menu open.
 */
export function MultiSelect({
  label,
  placeholder = "Selecione…",
  options,
  value,
  onChange,
  disabled,
  error,
  className = "",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  // Set when the menu is opened from the keyboard so the first render of the
  // menu moves focus into it (mouse users keep focus on the trigger).
  const focusMenuOnOpenRef = useRef(false);
  const tagsRef = useRef<HTMLUListElement>(null);
  // Index of the tag whose "x" was activated while it had focus: after the
  // removal re-renders, focus goes to the tag now at that index (the next
  // one), else the previous one, else the trigger.
  const focusTagAfterRemoveRef = useRef<number | null>(null);
  const selectedOptions = options.filter((option) =>
    value.includes(option.value),
  );
  const placement = menuPosition?.placement ?? "bottom";

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

    // The tag row sits above the trigger, so adding or removing a tag while
    // the menu is open moves the trigger: re-measure when the container resizes.
    const resizeObserver = new ResizeObserver(updatePosition);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    window.addEventListener("resize", updatePosition);
    // Capture phase so scrolling inside any ancestor repositions the menu.
    document.addEventListener("scroll", updatePosition, true);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
      setMenuPosition(null);
    };
  }, [open]);

  // Keyboard open: focus the first option once the menu is positioned (a
  // `visibility: hidden` element can't take focus, so not in the same pass).
  useEffect(() => {
    if (!menuPosition || !focusMenuOnOpenRef.current) return;
    focusMenuOnOpenRef.current = false;
    getOptionElements(menuRef.current)[0]?.focus();
  }, [menuPosition]);

  useEffect(() => {
    const index = focusTagAfterRemoveRef.current;
    if (index === null) return;
    focusTagAfterRemoveRef.current = null;
    const removeButtons = Array.from(
      tagsRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
    );
    (
      removeButtons[Math.min(index, removeButtons.length - 1)] ??
      triggerRef.current
    )?.focus();
  }, [value]);

  // Outside clicks: the menu isn't a DOM descendant of the container, so check both refs.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function close({ focusTrigger = false } = {}) {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }

  function toggle(optionValue: string) {
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    // Always hand back the selection in option order, whatever the click order.
    onChange(options.map((o) => o.value).filter((v) => next.includes(v)));
  }

  function removeTag(
    event: React.MouseEvent<HTMLButtonElement>,
    optionValue: string,
    index: number,
  ) {
    if (document.activeElement === event.currentTarget)
      focusTagAfterRemoveRef.current = index;
    toggle(optionValue);
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (open) {
        getOptionElements(menuRef.current)[0]?.focus();
      } else {
        focusMenuOnOpenRef.current = true;
        setOpen(true);
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
      // Mark the Escape as handled so an enclosing Dialog doesn't also close.
      event.preventDefault();
      event.stopPropagation();
      close({ focusTrigger: true });
    }
  }

  function handleBlur(event: React.FocusEvent<HTMLElement>) {
    const next = event.relatedTarget as Node | null;
    if (containerRef.current?.contains(next) || menuRef.current?.contains(next))
      return;
    setOpen(false);
  }

  const borderColor = error
    ? "border-[var(--color-danger)]"
    : open
      ? "border-[var(--color-primary)]"
      : "border-[var(--color-border)]";
  const triggerRadius = open
    ? placement === "bottom"
      ? "rounded-t-[var(--radius-md)]"
      : "rounded-b-[var(--radius-md)]"
    : "rounded-[var(--radius-md)]";

  return (
    <div
      ref={containerRef}
      className={`font-base relative flex flex-col gap-[6px] ${disabled ? "opacity-35" : ""} ${className}`}
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
      {selectedOptions.length > 0 && (
        <ul
          ref={tagsRef}
          aria-label="Selecionados"
          className="flex flex-wrap gap-[6px]"
        >
          {selectedOptions.map((option, index) => (
            <li
              key={option.value}
              className={`flex min-w-0 items-center gap-1 rounded-[var(--radius-full)] bg-[var(--color-surface-hover)] py-[4px] ${
                disabled ? "px-[10px]" : "pr-[4px] pl-[10px]"
              }`}
            >
              <span className="truncate text-[length:var(--text-xs)] leading-4 font-semibold text-[color:var(--color-text-primary)]">
                {option.label}
              </span>
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remover ${option.label}`}
                  // A mouse click keeps focus where it is (the trigger or an
                  // option), so it never blurs the container and closes the menu.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => removeTag(event, option.value, index)}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[var(--radius-full)] text-[color:var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-active)] hover:text-[color:var(--color-text-primary)] focus-visible:text-[color:var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--color-primary)]"
                >
                  <X aria-hidden width={12} height={12} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-listbox` : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        className={`flex w-full items-center justify-between gap-2 border bg-[var(--color-surface)] px-[14px] py-[10px] text-[length:var(--text-base)] transition-colors ${triggerRadius} ${borderColor}`}
      >
        <span className="min-w-0 truncate text-left text-[color:var(--color-text-tertiary)]">
          {placeholder}
        </span>
        <ChevronDown
          width={16}
          height={16}
          className={`shrink-0 text-[color:var(--color-text-secondary)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {error && (
        <span
          id={`${id}-error`}
          className="text-[11px] text-[color:var(--color-danger)]"
        >
          {error}
        </span>
      )}
      {open &&
        createPortal(
          <ul
            ref={menuRef}
            id={`${id}-listbox`}
            role="listbox"
            aria-multiselectable="true"
            aria-labelledby={id}
            style={{
              top: menuPosition?.top,
              left: menuPosition?.left,
              width: menuPosition?.width,
              visibility: menuPosition ? "visible" : "hidden",
            }}
            // Keep focus where it is when clicking an option, so the container's
            // blur handler doesn't close the menu before `click`.
            onMouseDown={(event) => event.preventDefault()}
            onKeyDown={handleMenuKeyDown}
            className={`font-base fixed z-[60] flex max-h-[360px] flex-col gap-0 overflow-y-auto border border-[var(--color-border)] bg-[var(--color-surface)] p-[6px] ${
              placement === "bottom"
                ? "rounded-b-[var(--radius-md)] border-t-0"
                : "rounded-t-[var(--radius-md)] border-b-0"
            }`}
          >
            {options.map((option) => {
              const isSelected = value.includes(option.value);
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    onClick={() => toggle(option.value)}
                    className="flex w-full items-center gap-[10px] rounded-[6px] px-[10px] py-[8px] text-left text-[length:var(--text-base)] text-[color:var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] focus-visible:bg-[var(--color-surface-hover)] focus-visible:outline-none"
                  >
                    <span
                      aria-hidden
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-[1.5px] transition-colors ${
                        isSelected
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                          : "border-[var(--color-border-strong)] bg-transparent"
                      }`}
                    >
                      {isSelected && (
                        <Check
                          width={13}
                          height={13}
                          className="text-[color:var(--color-primary-text)]"
                        />
                      )}
                    </span>
                    {option.label}
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
