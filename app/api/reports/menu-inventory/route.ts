import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT d.name AS drink_name, COUNT(r.ingredientid) AS ingredient_count
      FROM drinks d
      JOIN recipes r ON d.drinkid = r.drinkid
      JOIN ingredients i ON r.ingredientid = i.ingredientid
      WHERE LOWER(i.name) <> 'none'
      GROUP BY d.name
      ORDER BY ingredient_count DESC
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}