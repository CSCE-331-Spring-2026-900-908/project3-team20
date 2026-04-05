import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT ingredientid, name, totalquantity, cost FROM ingredients
       WHERE is_active = TRUE AND TRIM(LOWER(name)) <> 'none'
       ORDER BY ingredientid DESC`
    );
    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, totalquantity, cost } = await request.json();
    if (!name || totalquantity == null || cost == null) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const result = await pool.query(
      'INSERT INTO ingredients (name, totalquantity, cost) VALUES ($1, $2, $3) RETURNING ingredientid',
      [name, totalquantity, cost]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { ingredientid } = await request.json();
    await pool.query(
      'UPDATE ingredients SET is_active = FALSE WHERE ingredientid = $1',
      [ingredientid]
    );
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
