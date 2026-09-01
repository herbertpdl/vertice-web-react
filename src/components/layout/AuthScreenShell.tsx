import { AuthBrandPanel } from "./AuthBrandPanel";

interface AuthScreenShellProps {
  lines: [string, string, string];
  footerText: string;
  children: React.ReactNode;
}

export function AuthScreenShell({ lines, footerText, children }: AuthScreenShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-[var(--color-bg)]">
      <AuthBrandPanel lines={lines} footerText={footerText} />
      <div className="flex w-full flex-1 items-center justify-center p-[var(--space-10)]">
        {children}
      </div>
    </div>
  );
}
