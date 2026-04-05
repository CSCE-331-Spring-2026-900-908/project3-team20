import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
    const { name, totalquantity, price } = await request.json();
    if (!name || totalquantity == null || price == null) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const result = await pool.query(
      'INSERT INTO toppings (name, price, totalquantity) VALUES ($1, $2, $3) RETURNING toppingid',
      [name, price, totalquantity]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { toppingid, delta } = await request.json();
    await pool.query(
      'UPDATE toppings SET totalquantity = totalquantity + $1 WHERE toppingid = $2',
      [delta, toppingid]
    );
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { toppingid } = await request.json();
    await pool.query(
      'UPDATE toppings SET is_active = FALSE WHERE toppingid = $1',
      [toppingid]
    );
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
