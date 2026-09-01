interface SkeletonLineProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

export function SkeletonLine({
  width = 140,
  height = 12,
  className = "",
}: SkeletonLineProps) {
  return (
    <div
      style={{ width, height }}
      className={`skeleton-shimmer shrink-0 rounded-[var(--radius-full)] ${className}`}
    />
  );
}

interface SkeletonCircleProps {
  size?: number;
  className?: string;
}

export function SkeletonCircle({ size = 34, className = "" }: SkeletonCircleProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`skeleton-shimmer shrink-0 rounded-full ${className}`}
    />
  );
}

export function SkeletonBlock({
  width = 120,
  height = 80,
  className = "",
}: SkeletonLineProps) {
  return (
    <div
      style={{ width, height }}
      className={`skeleton-shimmer shrink-0 rounded-[var(--radius-md)] ${className}`}
    />
  );
}
