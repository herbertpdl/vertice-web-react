"use client";

import { Switch } from "@/components/ui";
import { stateLabel } from "@/lib/admin/featureFlags";

interface FlagSwitchProps {
  checked: boolean;
  /** Names the flag or the user number (§10). */
  "aria-label": string;
  /**
   * A save for this control is in flight (D9): `aria-disabled`, still focusable, and every
   * activation ignored. Never the `disabled` attribute, which would drop focus to `<body>`.
   */
  pending?: boolean;
  /** Called with the opposite of what the switch shows now (D5); the switch itself never moves. */
  onToggle: (target: boolean) => void;
  /** Where "Ligado"/"Desligado" sits: after the track (rows) or before it (the detail header). */
  labelSide?: "start" | "end";
  /** Marks the control for focus moves after a save (`focusFirstVisible`). */
  focusId: string;
}

/**
 * The kit `Switch`, always drawn from query data, plus its visible "Ligado"/"Desligado" text.
 * Clicking it only asks (`onToggle`): the parent saves and the list refetch moves it.
 */
export function FlagSwitch({
  checked,
  pending = false,
  onToggle,
  labelSide = "end",
  focusId,
  "aria-label": ariaLabel,
}: FlagSwitchProps) {
  const text = (
    <span
      aria-hidden="true"
      className={`text-[13px] font-semibold ${
        checked ? "text-[color:var(--color-text-primary)]" : "text-[color:var(--color-text-secondary)]"
      }`}
    >
      {stateLabel(checked)}
    </span>
  );
  return (
    <span className="flex items-center gap-[10px]">
      {labelSide === "start" && text}
      <Switch
        checked={checked}
        aria-label={ariaLabel}
        aria-disabled={pending || undefined}
        data-focus-id={focusId}
        onChange={() => {
          if (!pending) onToggle(!checked);
        }}
      />
      {labelSide === "end" && text}
    </span>
  );
}

/**
 * Focuses the first rendered control marked `data-focus-id={id}` that is visible: `DataTable`
 * renders every row twice (the table and the phone list), one of them `display: none`.
 */
export function focusFirstVisible(id: string): boolean {
  const target = Array.from(document.querySelectorAll<HTMLElement>(`[data-focus-id="${CSS.escape(id)}"]`)).find(
    (element) => element.getClientRects().length > 0,
  );
  target?.focus();
  return target !== undefined;
}
