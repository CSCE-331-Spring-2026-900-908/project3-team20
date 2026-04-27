export const HAPPY_HOUR_START = 9;  // 9:00 AM
export const HAPPY_HOUR_END = 12;   // 12:00 PM
export const HAPPY_HOUR_DISCOUNT_PCT = 20; // 20% off drinks

export function isHappyHour(hour: number): boolean {
  return hour >= HAPPY_HOUR_START && hour < HAPPY_HOUR_END;
}

export function applyHappyHourDiscount(price: number): number {
  return price * (1 - HAPPY_HOUR_DISCOUNT_PCT / 100);
}

export function formatHappyHourLabel(): string {
  const fmt = (h: number) => {
    const suffix = h >= 12 ? 'PM' : 'AM';
    const display = h > 12 ? h - 12 : h;
    return `${display}${suffix}`;
  };
  return `${fmt(HAPPY_HOUR_START)}–${fmt(HAPPY_HOUR_END)}`;
}
