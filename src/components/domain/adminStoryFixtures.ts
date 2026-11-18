import type { AdminDashboard, AdminWeeklySignups } from "@/lib/api/types";

/** The 12 weeks of frame `izEoo` (25/08 to 10/11), oldest first. */
export const adminWeeklySignups: AdminWeeklySignups[] = [
  ["2026-08-25", 4, 22],
  ["2026-09-01", 6, 31],
  ["2026-09-08", 3, 27],
  ["2026-09-15", 7, 35],
  ["2026-09-22", 5, 29],
  ["2026-09-29", 8, 41],
  ["2026-10-06", 6, 38],
  ["2026-10-13", 9, 46],
  ["2026-10-20", 5, 33],
  ["2026-10-27", 7, 44],
  ["2026-11-03", 8, 52],
  ["2026-11-10", 6, 41],
].map(([weekStart, trainers, clients]) => ({
  weekStart: weekStart as string,
  trainers: trainers as number,
  clients: clients as number,
}));

/** `GET /admin/dashboard` as frame `En3Ju` shows it. */
export const adminDashboard: AdminDashboard = {
  totals: { trainers: 128, clients: 1942 },
  active: { trainers7d: 94, clients7d: 1114, trainers30d: 112, clients30d: 1559 },
  completedWorkouts: { last7d: 3482, last30d: 14106 },
  weeklySignups: adminWeeklySignups,
};
