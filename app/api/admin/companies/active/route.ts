import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * /api/admin/companies/active
 *
 * Frontend contract requested:
 * - GET /admin/companies/active -> get current active company
 *
 * Implementation:
 * - Reads cookies set by /enter (client also mirrors to localStorage).
 */

export async function GET() {
  const jar = await cookies();
  const id = jar.get("active_company_id")?.value || "";
  const name = jar.get("active_company_name")?.value || "";

  if (!id) {
    return NextResponse.json({ ok: true, activeCompany: null });
  }

  return NextResponse.json({ ok: true, activeCompany: { id, name } });
}
