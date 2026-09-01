import { initials } from "@/lib/format";

export function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[12px] font-bold text-[#f2f6fa]"
    >
      {initials(name)}
    </div>
  );
}
