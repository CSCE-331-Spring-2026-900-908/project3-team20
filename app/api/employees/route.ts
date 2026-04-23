import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

function parseEmployeeId(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseRole(value: unknown) {
  if (value === true || value === 'true' || value === 'manager') return true;
  if (value === false || value === 'false' || value === 'cashier') return false;
  return null;
}

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT employeeid, name, role FROM employees ORDER BY employeeid'
    );
    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { employeeid, name, role } = await request.json();
    const parsedEmployeeId = parseEmployeeId(employeeid);
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const parsedRole = parseRole(role);

    if (!parsedEmployeeId || !trimmedName || parsedRole === null) {
      return NextResponse.json({ error: 'Missing or invalid employee fields' }, { status: 400 });
    }

    const result = await pool.query(
      'INSERT INTO employees (employeeid, name, role) VALUES ($1, $2, $3) RETURNING employeeid, name, role',
      [parsedEmployeeId, trimmedName, parsedRole]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: unknown) {
    if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
      return NextResponse.json({ error: 'An employee with that ID already exists' }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { employeeid, name, role } = await request.json();
    const parsedEmployeeId = parseEmployeeId(employeeid);
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const parsedRole = parseRole(role);

    if (!parsedEmployeeId || !trimmedName || parsedRole === null) {
      return NextResponse.json({ error: 'Missing or invalid employee fields' }, { status: 400 });
    }

    const result = await pool.query(
      'UPDATE employees SET name = $1, role = $2 WHERE employeeid = $3 RETURNING employeeid, name, role',
      [trimmedName, parsedRole, parsedEmployeeId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { employeeid } = await request.json();
    const parsedEmployeeId = parseEmployeeId(employeeid);

    if (!parsedEmployeeId) {
      return NextResponse.json({ error: 'Invalid employee ID' }, { status: 400 });
    }

    const [employeeCountResult, employeeResult, orderCountResult] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM employees'),
      pool.query('SELECT employeeid FROM employees WHERE employeeid = $1', [parsedEmployeeId]),
      pool.query('SELECT COUNT(*)::int AS count FROM orders WHERE employeeid = $1', [parsedEmployeeId]),
    ]);

    const employeeCount = Number(employeeCountResult.rows[0]?.count ?? 0);
    const orderCount = Number(orderCountResult.rows[0]?.count ?? 0);

    if (employeeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (employeeCount <= 1) {
      return NextResponse.json(
        { error: 'At least one employee must remain in the system' },
        { status: 400 }
      );
    }

    if (orderCount > 0) {
      return NextResponse.json(
        { error: 'This employee has existing orders and cannot be deleted' },
        { status: 409 }
      );
    }

    await pool.query('DELETE FROM employees WHERE employeeid = $1', [parsedEmployeeId]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
