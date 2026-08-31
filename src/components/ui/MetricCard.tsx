import { TrendingDown, TrendingUp } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

const trendColor: Record<NonNullable<MetricCardProps["trend"]>, string> = {
  up: "text-[var(--color-success)]",
  down: "text-[var(--color-danger)]",
  neutral: "text-[var(--color-text-secondary)]",
};

export function MetricCard({
  label,
  value,
  delta,
  trend = "up",
  className = "",
}: MetricCardProps) {
  const TrendIcon = trend === "down" ? TrendingDown : TrendingUp;

  return (
    <div
      className={`font-base flex w-[280px] flex-col gap-[var(--space-3)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-5)] ${className}`}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-[var(--text-sm)] text-[var(--color-text-secondary)]">
          {label}
        </span>
        {trend !== "neutral" && (
          <TrendIcon width={16} height={16} className={trendColor[trend]} />
        )}
      </div>
      <span className="font-heading text-[var(--text-2xl)] font-bold text-[var(--color-text-primary)]">
        {value}
      </span>
      {delta && (
        <span className={`text-[12px] ${trendColor[trend]}`}>{delta}</span>
      )}
    </div>
  );
}
