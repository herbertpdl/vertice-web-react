import { SkeletonCircle, SkeletonLine } from "./Skeleton";

interface ListRowSkeletonProps {
  className?: string;
}

export function ListRowSkeleton({ className = "" }: ListRowSkeletonProps) {
  return (
    <div
      className={`font-base flex w-[280px] flex-col gap-[var(--space-2)] py-[var(--space-3)] ${className}`}
    >
      <div className="flex w-full items-center justify-between gap-[var(--space-3)]">
        <div className="flex items-center gap-2">
          <SkeletonCircle size={20} />
          <SkeletonLine width={120} height={11} />
        </div>
        <SkeletonLine width={40} height={9} />
      </div>
      <SkeletonLine width="100%" height={11} />
      <SkeletonLine width={220} height={11} />
    </div>
  );
}
