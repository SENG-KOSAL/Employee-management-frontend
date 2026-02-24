import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * /api/admin/companies/exit
 *
 * Frontend contract requested:
 * - POST /admin/companies/exit -> exit company context
 *
 * Implementation:
 * - Proxies to backend audit endpoint:
 *   - POST /api/v1/platform/context/exit
 * - Clears cookies used by /active.
 */

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function getAuth(req: Request): string | null {
  return req.headers.get("authorization");
}

export async function POST(req: Request) {
  try {
    const auth = getAuth(req);
    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "Content-Type": "application/json",
    };
    if (auth) headers.Authorization = auth;

    const upstream = await fetch(`${BACKEND}/api/v1/platform/context/exit`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });

    const text = await upstream.text();

    const jar = await cookies();
    jar.delete("active_company_id");
    jar.delete("active_company_name");

    return NextResponse.json(
      {
        ok: upstream.ok,
        status: upstream.status,
        upstream: safeJsonOrText(text),
      },
      { status: upstream.status }
    );
  } catch (e) {
    return NextResponse.json({ message: "Failed to exit company context", error: String(e) }, { status: 500 });
  }
}

function safeJsonOrText(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
