import { LoaderCircle } from "lucide-react";

export type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "w-[14px] h-[14px]",
  md: "w-[20px] h-[20px]",
  lg: "w-[32px] h-[32px]",
};

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <LoaderCircle
      className={`animate-spin text-[var(--color-primary)] ${sizeClasses[size]} ${className}`}
    />
  );
}
