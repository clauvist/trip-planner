const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOWS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Computes the calendar date for day index `i` (0-based) relative to a trip start date, in UTC to avoid timezone drift. */
export function dayDate(startDate: Date, i: number): Date {
  const d = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + i);
  return d;
}

export function fmtDate(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function fmtDow(d: Date): string {
  return DOWS[d.getUTCDay()];
}

export function tripMeta(startDate: Date, dayCount: number): string {
  const start = dayDate(startDate, 0);
  const end = dayDate(startDate, dayCount - 1);
  const range =
    start.getUTCMonth() === end.getUTCMonth()
      ? `${fmtDate(start)}–${end.getUTCDate()}`
      : `${fmtDate(start)}–${fmtDate(end)}`;
  return `${range} · ${dayCount} DAYS`.toUpperCase();
}
