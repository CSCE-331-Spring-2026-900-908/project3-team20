export const APP_TIMEZONE = 'America/Chicago';

export function getChicagoDate(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE });
}

export function getChicagoHour(now: Date = new Date()): number {
  const h = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hour: 'numeric',
    hour12: false,
  }).format(now);
  const n = parseInt(h, 10);
  return n === 24 ? 0 : n;
}
