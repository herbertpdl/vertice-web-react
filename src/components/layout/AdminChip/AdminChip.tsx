/** The violet "Admin" chip next to the wordmark (pen.dev `rDhgL`: login brand panel, `izLYp`). */
export function AdminChip({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`rounded-[var(--radius-full)] bg-[#7C4DFF26] text-[10px] font-bold text-[color:var(--color-secondary-hover)] ${
        // The phone top bar's chip (`fXng6`) is a pixel tighter and has no letter spacing.
        compact ? "px-[7px] py-[2px]" : "px-[8px] py-[3px] tracking-[0.4px]"
      }`}
    >
      Admin
    </span>
  );
}
