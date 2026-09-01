import Image from "next/image";

interface AuthBrandPanelProps {
  lines: [string, string, string];
  footerText: string;
}

export function AuthBrandPanel({ lines, footerText }: AuthBrandPanelProps) {
  return (
    <div className="font-base hidden h-full w-[560px] shrink-0 flex-col justify-between overflow-hidden bg-[var(--color-bg)] p-[var(--space-12)] lg:flex">
      <div className="flex items-center gap-[var(--space-3)]">
        <Image src="/logo-mark.png" alt="" width={34} height={34} priority />
        <span className="font-heading text-[length:var(--text-lg)] font-semibold tracking-[3px] text-[color:var(--color-text-primary)]">
          VERTICE
        </span>
      </div>

      <div className="flex w-full flex-col">
        <span className="font-heading text-[60px] leading-[1.02] font-bold text-[color:var(--color-text-primary)]">
          {lines[0]}
        </span>
        <span className="font-heading text-[60px] leading-[1.02] font-bold text-[color:var(--color-primary)]">
          {lines[1]}
        </span>
        <span className="font-heading text-[60px] leading-[1.02] font-bold text-[color:var(--color-text-primary)]">
          {lines[2]}
        </span>
      </div>

      <p className="max-w-[420px] text-[13px] leading-[1.5] text-[color:var(--color-text-secondary)]">
        {footerText}
      </p>
    </div>
  );
}
