/** Civil clock helpers. Function startsAt is stored as UTC Date representing Europe/Madrid wall time. */

export const MADRID_TZ = 'Europe/Madrid';

export function formatMadrid(d: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: MADRID_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(d)
    .replace(' ', 'T');
}

export function madridYmd(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MADRID_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Build a Date whose Madrid wall clock is y-m-d H:M. */
export function madridWall(y: number, m: number, d: number, hour: number, minute = 0): Date {
  const guess = Date.UTC(y, m - 1, d, hour, minute, 0);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: MADRID_TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date(guess)).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
  );
  const offset = asUtc - guess;
  return new Date(guess - offset);
}

export function slotBand(startsAt: Date): 'manana' | 'tarde' | 'merienda' {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: MADRID_TZ,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(startsAt),
  );
  if (hour < 14) return 'manana';
  if (hour < 18) return 'merienda';
  return 'tarde';
}
