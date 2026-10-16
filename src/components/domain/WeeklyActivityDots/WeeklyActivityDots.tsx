import type { WeekActivityDay } from "@/lib/api/types";
import { DAY_INITIAL } from "@/lib/days";

export function WeeklyActivityDots({ days }: { days: WeekActivityDay[] }) {
  return (
    <div className="flex items-center gap-[6px]" title="Atividade da semana">
      {days.map((day) => (
        <div
          key={day.date}
          title={day.dayOfWeek}
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold ${
            day.completed
              ? "bg-[var(--color-success)] text-[color:var(--color-bg)]"
              : "bg-[var(--color-surface-hover)] text-[color:var(--color-text-tertiary)]"
          }`}
        >
          {DAY_INITIAL[day.dayOfWeek]}
        </div>
      ))}
    </div>
  );
}
