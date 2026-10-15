import { AuthBrandPanel } from "../AuthBrandPanel";
import { LegalFooter } from "../LegalFooter";

interface AuthScreenShellProps {
  lines: [string, string, string];
  footerText: string;
  children: React.ReactNode;
}

export function AuthScreenShell({ lines, footerText, children }: AuthScreenShellProps) {
  return (
    // `shrink-0`: the body is a flex column, and a long page (the legal texts) must grow the shell
    // rather than overflow it, so the brand panel can stay in view (sticky) while it scrolls.
    <div className="flex min-h-screen w-full shrink-0 bg-[var(--color-bg)]">
      <AuthBrandPanel lines={lines} footerText={footerText} />
      <div className="flex w-full flex-1 flex-col items-center gap-[var(--space-8)] p-[var(--space-10)]">
        <div className="flex w-full flex-1 items-center justify-center">{children}</div>
        <LegalFooter />
      </div>
    </div>
  );
}
