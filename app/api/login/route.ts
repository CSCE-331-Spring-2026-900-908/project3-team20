import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

// Database connection pool - reads DATABASE_URL from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * POST /api/login
 *
 * Authenticates an employee using username/password and verifies role access.
 * Expected JSON body: { username: string, password: string, role: "cashier" | "manager" }
 */
export async function POST(req: NextRequest) {
  try {
    const { username, password, role } = await req.json();

    // Basic validation - username and role are required
    if (!username || !role) {
      return NextResponse.json(
        { success: false, error: "Missing credentials" },
        { status: 400 }
      );
    }

    // TODO: Replace hardcoded password with hashed password lookup from DB
    // For now, all employees use the same default password
    if (password !== "employee") {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Look up the employee by their ID (username == employeeid)
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM employees WHERE employeeid = $1`,
        [username]
      );

      // No matching employee found
      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Invalid username or password" },
          { status: 401 }
        );
      }

      const employee = result.rows[0];

      // Manager role check: the role column stores TRUE/'t'/'T' for managers
      // Only allow manager login if the employee has manager privileges
      if (role === "manager" && employee.role !== true && employee.role !== "t" && employee.role !== "T") {
        return NextResponse.json(
          { success: false, error: "Access denied. Manager privileges required." },
          { status: 403 }
        );
      }

      // Login successful
      return NextResponse.json({ success: true });

    } finally {
      // Always release the client back to the pool, even if an error occurs
      client.release();
    }

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
