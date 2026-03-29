import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT drinkid, name, cost, category FROM drinks WHERE name IS NOT NULL ORDER BY category, name'
    );
    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error fetching drinks:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
