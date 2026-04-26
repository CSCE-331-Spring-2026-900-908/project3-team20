import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const drinkid = searchParams.get('drinkid');

  try {
    if (drinkid) {
      const result = await pool.query(
        'SELECT ingredientid, amountused AS amount FROM recipes WHERE drinkid = $1',
        [drinkid]
      );
      return NextResponse.json(result.rows);
    }

    const result = await pool.query(
      'SELECT drinkid, name, cost, category, image_url FROM drinks WHERE name IS NOT NULL ORDER BY category, name'
    );
    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error fetching drinks:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
    const { drinkid, name, cost, category, image_url, recipes } = await request.json();
    await client.query('BEGIN');

    await client.query(
      'UPDATE drinks SET name = $1, cost = $2, category = $3, image_url = $4 WHERE drinkid = $5',
      [name, cost, category || 'other', image_url || null, drinkid]
    );

    await client.query('DELETE FROM recipes WHERE drinkid = $1', [drinkid]);

    for (const row of recipes) {
      await client.query(
        'INSERT INTO recipes (drinkid, ingredientid, amountused) VALUES ($1, $2, $3)',
        [drinkid, row.ingredientid, row.amount]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : String(error);
    console.error('PUT /api/drinks error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}


export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const { name, cost, category, image_url, recipes } = await request.json();
    await client.query('BEGIN');

    const drinkResult = await client.query(
      'INSERT INTO drinks (name, cost, category, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, cost, category || 'other', image_url || null]
    );
    const drinkid = drinkResult.rows[0].drinkid;

    for (const row of recipes) {
      await client.query(
        'INSERT INTO recipes (drinkid, ingredientid, amountused) VALUES ($1, $2, $3)',
        [drinkid, row.ingredientid, row.amount]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json(drinkResult.rows[0]);
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : String(error);
    console.error('POST /api/drinks error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    const { drinkid } = await request.json();
    await client.query('BEGIN');
    await client.query('DELETE FROM recipes WHERE drinkid = $1', [drinkid]);
    await client.query('DELETE FROM drinks WHERE drinkid = $1', [drinkid]);
    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : String(error);
    console.error('DELETE /api/drinks error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    client.release();
  }
}