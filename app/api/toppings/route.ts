import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT toppingid, name, price, totalquantity FROM toppings WHERE is_active = true ORDER BY name'
    );
    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error fetching toppings:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
