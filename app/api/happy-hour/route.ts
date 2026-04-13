import { NextResponse } from 'next/server';
import {
  HAPPY_HOUR_START,
  HAPPY_HOUR_END,
  HAPPY_HOUR_DISCOUNT_PCT,
  isHappyHour,
  formatHappyHourLabel,
} from '@/lib/happyHour';

export async function GET() {
  const hour = new Date().getHours();
  return NextResponse.json({
    active: isHappyHour(hour),
    startHour: HAPPY_HOUR_START,
    endHour: HAPPY_HOUR_END,
    discountPct: HAPPY_HOUR_DISCOUNT_PCT,
    label: formatHappyHourLabel(),
  });
}
