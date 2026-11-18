import { useId } from "react";
import { SkeletonBlock } from "@/components/ui";
import { chartScale } from "@/lib/admin/chartScale";
import type { AdminWeeklySignups } from "@/lib/api/types";
import { formatCount, formatDayMonth } from "@/lib/format";

interface WeeklySignupsChartProps {
  /** `AdminDashboard.weeklySignups`: oldest week first, the last one the current partial week. */
  weeks: AdminWeeklySignups[] | undefined;
  loading?: boolean;
}

const BAR_WIDTH = 14;
const BAR_GAP = 4;
const PLOT_HEIGHT = 200;
const COMPACT_HEIGHT = 110;

const SERIES = [
  { key: "trainers", label: "Treinadores", fill: "fill-[var(--color-secondary)]", swatch: "bg-[var(--color-secondary)]" },
  { key: "clients", label: "Alunos", fill: "fill-[var(--color-primary)]", swatch: "bg-[var(--color-primary)]" },
] as const;

/** A bar of `height` px standing on `bottom`, its two top corners rounded by 3 px. */
function barPath(x: number, bottom: number, height: number): string {
  const top = bottom - height;
  const r = Math.min(3, height, BAR_WIDTH / 2);
  return `M${x},${bottom}V${top + r}Q${x},${top} ${x + r},${top}H${x + BAR_WIDTH - r}Q${x + BAR_WIDTH},${top} ${x + BAR_WIDTH},${top + r}V${bottom}Z`;
}

/** A non-zero value never draws thinner than 2 px, so a single sign-up stays visible. */
function barHeight(value: number, top: number, plot: number): number {
  if (value <= 0) return 0;
  return Math.max(2, (value / top) * plot);
}

function summary(weeks: AdminWeeklySignups[]): string {
  const trainers = weeks.reduce((sum, week) => sum + week.trainers, 0);
  const clients = weeks.reduce((sum, week) => sum + week.clients, 0);
  return `Novos cadastros nas últimas ${weeks.length} semanas: ${formatCount(trainers)} treinadores e ${formatCount(clients)} alunos.`;
}

function Legend({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? "gap-[10px]" : "gap-[16px]"}`}>
      {SERIES.map((series) => (
        <span key={series.key} className={`flex items-center ${compact ? "gap-[4px]" : "gap-[6px]"}`}>
          <span
            aria-hidden="true"
            className={`rounded-[2px] ${series.swatch} ${compact ? "h-[8px] w-[8px]" : "h-[10px] w-[10px]"}`}
          />
          <span className={`${compact ? "text-[10px]" : "text-[12px]"} text-[color:var(--color-text-secondary)]`}>
            {series.label}
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * New trainers and clients per week (pen.dev chart card `izEoo` in `En3Ju`; the phone card of
 * `qzCk9`; admin-panel spec W13): 12 × 2 grouped bars drawn as plain SVG, with no chart library.
 * The y axis is rounded up to four ticks (`chartScale`), the weeks are labelled dd/MM from
 * `weekStart` (a business date). Screen readers get a one-line summary and a hidden table of the
 * 24 values.
 */
export function WeeklySignupsChart({ weeks, loading = false }: WeeklySignupsChartProps) {
  const titleId = useId();
  const ready = !loading && weeks !== undefined;
  const { ticks, top } = chartScale(
    ready ? Math.max(0, ...weeks.flatMap((week) => [week.trainers, week.clients])) : 0,
  );

  return (
    <section
      aria-labelledby={titleId}
      className="font-base flex w-full flex-col gap-[12px] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[14px] lg:gap-0 lg:p-0"
    >
      <div className="flex w-full items-center justify-between lg:px-[20px] lg:py-[16px]">
        <div className="flex flex-col gap-[2px]">
          <h2
            id={titleId}
            className="font-heading text-[length:var(--text-base)] font-semibold text-[color:var(--color-text-primary)] lg:text-[length:var(--text-md)]"
          >
            Novos treinadores e alunos por semana
          </h2>
          <p className="hidden text-[12px] text-[color:var(--color-text-tertiary)] lg:block">
            Últimas 12 semanas
          </p>
        </div>
        <div className="hidden lg:block">
          <Legend />
        </div>
      </div>

      {!ready ? (
        <div className="w-full lg:px-[20px] lg:pt-[4px] lg:pb-[16px]">
          <SkeletonBlock width="100%" height={220} className="hidden lg:block" />
          <SkeletonBlock width="100%" height={COMPACT_HEIGHT} className="lg:hidden" />
        </div>
      ) : (
        <>
          <div role="img" aria-label={summary(weeks)} className="w-full">
            {/* From `lg` (a computer; below it the rail leaves too little room for 12 × 32 px weeks): y axis, bars and a dd/MM label under each week. */}
            <div className="hidden w-full gap-[12px] px-[20px] pt-[4px] pb-[16px] lg:flex">
              <div
                style={{ height: PLOT_HEIGHT }}
                className="flex flex-col items-end justify-between text-[10px] text-[color:var(--color-text-tertiary)]"
              >
                {ticks.map((tick) => (
                  <span key={tick}>{formatCount(tick)}</span>
                ))}
              </div>
              <div className="flex min-w-0 flex-1 gap-[8px]">
                {weeks.map((week) => (
                  <div key={week.weekStart} className="flex min-w-0 flex-1 flex-col items-center gap-[6px]">
                    <svg
                      width={BAR_WIDTH * 2 + BAR_GAP}
                      height={PLOT_HEIGHT}
                      viewBox={`0 0 ${BAR_WIDTH * 2 + BAR_GAP} ${PLOT_HEIGHT}`}
                      aria-hidden="true"
                    >
                      {SERIES.map((series, i) => {
                        const height = barHeight(week[series.key], top, PLOT_HEIGHT);
                        return height > 0 ? (
                          <path
                            key={series.key}
                            className={series.fill}
                            d={barPath(i * (BAR_WIDTH + BAR_GAP), PLOT_HEIGHT, height)}
                          />
                        ) : null;
                      })}
                    </svg>
                    <span className="text-[10px] text-[color:var(--color-text-tertiary)]">
                      {formatDayMonth(week.weekStart)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Phone and tablet: the bars only, with the first and last week under them. */}
            <div className="flex flex-col gap-[12px] lg:hidden">
              <div
                style={{ height: COMPACT_HEIGHT }}
                className="flex w-full items-end gap-[4px] border-b border-[var(--color-border)]"
              >
                {weeks.map((week) => (
                  <div key={week.weekStart} className="flex h-full min-w-0 flex-1 items-end justify-center gap-[2px]">
                    {SERIES.map((series) => (
                      <span
                        key={series.key}
                        style={{ height: barHeight(week[series.key], top, COMPACT_HEIGHT) }}
                        className={`w-full max-w-[8px] rounded-t-[2px] ${series.swatch}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex w-full items-center justify-between text-[10px] text-[color:var(--color-text-tertiary)]">
                <span>{weeks.length > 0 ? formatDayMonth(weeks[0].weekStart) : ""}</span>
                <Legend compact />
                <span>{weeks.length > 0 ? formatDayMonth(weeks[weeks.length - 1].weekStart) : ""}</span>
              </div>
            </div>
          </div>

          <table className="sr-only">
            <caption>Novos cadastros por semana</caption>
            <thead>
              <tr>
                <th scope="col">Semana de</th>
                <th scope="col">Treinadores</th>
                <th scope="col">Alunos</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week.weekStart}>
                  <th scope="row">{formatDayMonth(week.weekStart)}</th>
                  <td>{week.trainers}</td>
                  <td>{week.clients}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
