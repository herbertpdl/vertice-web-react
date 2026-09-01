import { Spinner } from "./Spinner";

interface PageLoadingOverlayProps {
  text?: string;
  className?: string;
}

export function PageLoadingOverlay({
  text = "Carregando dados...",
  className = "",
}: PageLoadingOverlayProps) {
  return (
    <div
      className={`font-base absolute inset-0 flex flex-col items-center justify-center gap-[var(--space-4)] bg-[#0a0e14e8] ${className}`}
    >
      <Spinner size="lg" />
      <span className="text-[var(--text-base)] text-[var(--color-text-secondary)]">
        {text}
      </span>
    </div>
  );
}
