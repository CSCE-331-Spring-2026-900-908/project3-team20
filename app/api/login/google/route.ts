import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") || process.env.DATABASE_URL?.includes("127.0.0.1")
    ? false
    : { rejectUnauthorized: false },
});

const ALLOWED_EMAILS = [
  "reveille.bubbletea@gmail.com",
];

function isEmailAllowed(email: string): boolean {
  return email.endsWith("tamu.edu") || ALLOWED_EMAILS.includes(email);
}

/**
 * POST /api/login/google
 *
 * Validates a Google ID token, enforces email domain restrictions,
 * looks up the employee by email, and verifies manager status.
 *
 * Request: { googleToken: string }
 * Response: { success: true, id: number, name: string } | { success: false, error: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { googleToken } = await req.json();

    if (!googleToken) {
      return NextResponse.json({ success: false, error: "Missing googleToken" }, { status: 400 });
    }

    // Step 1: Validate the token with Google
    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${googleToken}`
    );

    if (!tokenInfoRes.ok) {
      return NextResponse.json({ success: false, error: "Invalid Google token" }, { status: 401 });
    }

    const tokenInfo = await tokenInfoRes.json();
    // Normalize: lowercase, trim, strip invisible unicode characters
    const rawEmail = tokenInfo.email || "";
    const email = rawEmail.toLowerCase().trim().replace(/[​-‍﻿]/g, "");

    if (!email) {
      return NextResponse.json({ success: false, error: "Email not found in token" }, { status: 401 });
    }

    // Step 2: Enforce email domain restriction
    if (!isEmailAllowed(email)) {
      return NextResponse.json(
        { success: false, error: "Access restricted to @tamu.edu accounts" },
        { status: 403 }
      );
    }

    // Step 3: Look up employee by email
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM employees WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "No employee found with this email" },
          { status: 404 }
        );
      }

      const employee = result.rows[0];

      // Step 4: Verify manager status
      if (employee.role !== true && employee.role !== "t" && employee.role !== "T") {
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
      res.cookies.set('manager_auth', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 8,
      });
      return res;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Google login error:", error);
    return NextResponse.json({ success: false, error: "Internal server error", detail: String(error) }, { status: 500 });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
