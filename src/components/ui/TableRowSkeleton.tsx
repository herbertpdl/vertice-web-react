import { SkeletonCircle, SkeletonLine } from "./Skeleton";

interface TableRowSkeletonProps {
  className?: string;
}

export function TableRowSkeleton({ className = "" }: TableRowSkeletonProps) {
  return (
    <div
      className={`font-base flex items-center gap-[var(--space-4)] border border-[var(--color-border)] px-[var(--space-5)] py-[var(--space-4)] ${className}`}
    >
      <div className="flex items-center gap-[10px]">
        <SkeletonCircle size={34} />
        <div className="flex flex-col gap-[6px]">
          <SkeletonLine width={110} height={11} />
          <SkeletonLine width={140} height={9} />
        </div>
      </div>
      <div className="flex w-[140px] flex-col gap-[6px]">
        <SkeletonLine width={130} height={11} />
        <SkeletonLine width={90} height={9} />
      </div>
      <SkeletonLine width={80} height={11} />
    </div>
  );
}
