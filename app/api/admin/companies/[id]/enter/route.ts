import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * /api/admin/companies/:id/enter
 *
 * Frontend contract requested:
 * - POST /admin/companies/{id}/enter  -> enter company context
 *
 * Implementation:
 * - Proxies to backend audit endpoint (platform contract we already aligned to):
 *   - POST /api/v1/platform/context/enter with { company_id }
 * - Sets cookies so the frontend can restore Support Mode after a reload:
 *   - active_company_id
 *   - active_company_name (best-effort)
 */

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function getAuth(req: Request): string | null {
  return req.headers.get("authorization");
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    const auth = getAuth(req);
    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "Content-Type": "application/json",
    };
    if (auth) headers.Authorization = auth;

    // Inform backend (audit / security event)
    const upstream = await fetch(`${BACKEND}/api/v1/platform/context/enter`, {
      method: "POST",
      headers,
      body: JSON.stringify({ company_id: Number.isFinite(Number(id)) ? Number(id) : id }),
    });

    const text = await upstream.text();

    // Best-effort to extract a company name from backend response
    let name = "";
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === "object") {
        const rec = parsed as Record<string, unknown>;
        const active = rec.active_company || rec.company;
        if (active && typeof active === "object") {
          const a = active as Record<string, unknown>;
          if (typeof a.name === "string") name = a.name;
        }
      }
    } catch {
      // ignore JSON parse
    }

    // Persist in cookies for /active endpoint (only on success)
    if (upstream.ok) {
      const jar = await cookies();
      jar.set("active_company_id", id, { path: "/", sameSite: "lax" });
      jar.set("active_company_name", name, { path: "/", sameSite: "lax" });
    }

    // Return a normalized payload for the client context
    return NextResponse.json(
      {
        ok: upstream.ok,
        status: upstream.status,
        activeCompany: { id, name },
        upstream: safeJsonOrText(text),
      },
      { status: upstream.status }
    );
  } catch (e) {
    return NextResponse.json({ message: "Failed to enter company context", error: String(e) }, { status: 500 });
  }
}

function safeJsonOrText(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
