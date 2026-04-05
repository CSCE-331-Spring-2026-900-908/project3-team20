import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT anythingid, name, price, totalquantity FROM misc WHERE is_active = TRUE ORDER BY anythingid'
    );
    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, totalquantity, price } = await request.json();
    if (!name || totalquantity == null || price == null) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const result = await pool.query(
      'INSERT INTO misc (name, totalquantity, price) VALUES ($1, $2, $3) RETURNING anythingid',
      [name, totalquantity, price]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { anythingid, delta } = await request.json();
    await pool.query(
      'UPDATE misc SET totalquantity = totalquantity + $1 WHERE anythingid = $2',
      [delta, anythingid]
    );
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { anythingid } = await request.json();
    await pool.query(
      'UPDATE misc SET is_active = FALSE WHERE anythingid = $1',
      [anythingid]
    );
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
