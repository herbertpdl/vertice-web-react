import { TrendingDown, TrendingUp } from "lucide-react";
import { SkeletonCircle, SkeletonLine } from "./Skeleton";

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
  className?: string;
}

const trendColor: Record<NonNullable<MetricCardProps["trend"]>, string> = {
  up: "text-[color:var(--color-success)]",
  down: "text-[color:var(--color-danger)]",
  neutral: "text-[color:var(--color-text-secondary)]",
};

export function MetricCard({
  label,
  value,
  delta,
  trend = "up",
  loading = false,
  className = "",
}: MetricCardProps) {
  const TrendIcon = trend === "down" ? TrendingDown : TrendingUp;

  return (
    <div
      className={`font-base flex w-[280px] flex-col gap-[var(--space-3)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-5)] ${className}`}
    >
      {loading ? (
        <>
          <div className="flex w-full items-center justify-between">
            <SkeletonLine width={90} height={10} />
            <SkeletonCircle size={16} />
          </div>
          <SkeletonLine width={100} height={24} />
          <SkeletonLine width={150} height={10} />
        </>
      ) : (
        <>
          <div className="flex w-full items-center justify-between">
            <span className="text-[length:var(--text-sm)] text-[color:var(--color-text-secondary)]">
              {label}
            </span>
            {trend !== "neutral" && (
              <TrendIcon width={16} height={16} className={trendColor[trend]} />
            )}
          </div>
          <span className="font-heading text-[length:var(--text-2xl)] font-bold text-[color:var(--color-text-primary)]">
            {value}
          </span>
          {delta && (
            <span className={`text-[12px] ${trendColor[trend]}`}>{delta}</span>
          )}
        </>
      )}
    </div>
  );
}
