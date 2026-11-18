import type { ReactNode } from "react";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { SkeletonCircle, SkeletonLine } from "../Skeleton";

interface MetricCardProps {
  label: string;
  /** Ignored when `children` is given. */
  value?: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
  /** A fixed icon in the primary color, in place of the trend arrow (the admin dashboard's cards). */
  icon?: LucideIcon;
  /** A custom body in place of `value` and `delta` (e.g. the admin dashboard's 7/30-day split). */
  children?: ReactNode;
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
  icon: Icon,
  children,
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
            {Icon ? (
              <Icon
                aria-hidden="true"
                width={16}
                height={16}
                className="text-[color:var(--color-primary)]"
              />
            ) : (
              trend !== "neutral" && (
                <TrendIcon width={16} height={16} className={trendColor[trend]} />
              )
            )}
          </div>
          {children ?? (
            <>
              <span className="font-heading text-[length:var(--text-2xl)] font-bold text-[color:var(--color-text-primary)]">
                {value}
              </span>
              {delta && (
                <span className={`text-[12px] ${trendColor[trend]}`}>{delta}</span>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
