import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        DATE_TRUNC('week', date) AS week,
        COUNT(orderid) AS orders_in_week
      FROM orders
      GROUP BY week
      ORDER BY week
    `);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}