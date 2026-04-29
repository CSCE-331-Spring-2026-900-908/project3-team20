import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

// Database connection pool - reads DATABASE_URL from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") || process.env.DATABASE_URL?.includes("127.0.0.1")
    ? false
    : { rejectUnauthorized: false },
});

/**
 * POST /api/login
 *
 * Authenticates an employee using username/password and verifies role access.
 * Expected JSON body: { pin: string, role: "cashier" | "manager" }
 */
export async function POST(req: NextRequest) {
  try {
    const { pin, role } = await req.json();

    if (!role || !pin) {
      return NextResponse.json({ success: false, error: "Missing credentials" }, { status: 400 });
    }

    if (role !== "cashier" && role !== "manager") {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM employees WHERE employeeid = $1`,
        [pin]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: "Invalid PIN" }, { status: 401 });
      }

      const employee = result.rows[0];

      if (role === "manager" && employee.role !== true && employee.role !== "t" && employee.role !== "T") {
        return NextResponse.json(
          { success: false, error: "Access denied. Manager privileges required." },
          { status: 403 }
        );
      }

      const res = NextResponse.json({
        success: true,
        id: employee.employeeid,
        name: employee.name,
      });
      if (role === 'manager') {
        res.cookies.set('manager_auth', 'true', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 8,
        });
      }
      return res;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
