import { NextResponse } from 'next/server';
import {
  HAPPY_HOUR_START,
  HAPPY_HOUR_END,
  HAPPY_HOUR_DISCOUNT_PCT,
  isHappyHour,
  formatHappyHourLabel,
} from '@/lib/happyHour';
import { getChicagoHour } from '@/lib/time';

export async function GET() {
  const hour = getChicagoHour();
  return NextResponse.json({
    active: isHappyHour(hour),
    startHour: HAPPY_HOUR_START,
    endHour: HAPPY_HOUR_END,
    discountPct: HAPPY_HOUR_DISCOUNT_PCT,
    label: formatHappyHourLabel(),
  });
}
