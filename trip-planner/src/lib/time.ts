export interface TimeInterval {
  start: number;
  end: number;
}

function toMinutes(token: string): number | null {
  if (!token) return null;
  let plus = 0;
  const plusMatch = token.match(/\+(\d+)/);
  if (plusMatch) plus = parseInt(plusMatch[1], 10) * 1440;
  const hm = token.match(/(\d{1,2})(\d{2})/);
  if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10) + plus;
  const h = token.match(/(\d{1,2})\s*h/);
  if (h) return parseInt(h[1], 10) * 60 + plus;
  return null;
}

export function parseInterval(raw: string | null | undefined): TimeInterval | null {
  if (!raw) return null;
  try {
    const s = String(raw).replace(/~/g, "").trim();
    const parts = s
      .split(/[–—-]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const a = toMinutes(parts[0]);
      let b = toMinutes(parts[1]);
      if (a == null) return null;
      if (b == null) b = a + 60;
      if (b < a) b += 1440;
      return { start: a, end: b };
    }
    const a = toMinutes(parts[0]);
    if (a == null) return null;
    return { start: a, end: a + 60 };
  } catch {
    return null;
  }
}

/** Returns, per-index, whether that activity's time overlaps another in the same list. */
export function findConflicts(times: (string | null | undefined)[]): boolean[] {
  const intervals = times.map(parseInterval);
  const conflicts = times.map(() => false);
  for (let x = 0; x < intervals.length; x++) {
    for (let y = x + 1; y < intervals.length; y++) {
      const a = intervals[x];
      const b = intervals[y];
      if (a && b && a.start < b.end && b.start < a.end) {
        conflicts[x] = true;
        conflicts[y] = true;
      }
    }
  }
  return conflicts;
}
