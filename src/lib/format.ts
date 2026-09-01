const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

const longDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDateShort(isoDate: string): string {
  return shortDateFormatter.format(new Date(`${isoDate}T00:00:00`)).replace(".", "");
}

export function formatDateLong(isoDate: string): string {
  return longDateFormatter.format(new Date(`${isoDate}T00:00:00`)).replace(".", "");
}

export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDateShort(startDate)} – ${formatDateLong(endDate)}`;
}

export function formatRelativeTime(isoTimestamp: string): string {
  if (!isoTimestamp) return "";
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes}min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  return `há ${diffDays}d`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function daysUntil(isoDate: string): number {
  return Math.ceil(
    (new Date(`${isoDate}T00:00:00`).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
}

export function daysLeftLabel(daysLeft: number): string {
  if (daysLeft <= 0) return "vence hoje";
  if (daysLeft === 1) return "1 dia";
  return `${daysLeft} dias`;
}
