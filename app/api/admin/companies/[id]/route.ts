import { NextRequest, NextResponse } from "next/server";

/**
 * /api/admin/companies/:id
 *
 * Optional but useful for edit views:
 * - GET /admin/companies/:id
 * - PUT /admin/companies/:id
 *
 * Proxies to:
 * - GET /api/v1/platform/companies/:id
 * - PUT /api/v1/platform/companies/:id
 */

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function backendUrl(pathname: string) {
  return `${BACKEND}${pathname}`;
}

function getAuth(req: Request): string | null {
  return req.headers.get("authorization");
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const auth = getAuth(req);
    const headers: Record<string, string> = { Accept: "application/json" };
    if (auth) headers.Authorization = auth;

    const res = await fetch(backendUrl(`/api/v1/platform/companies/${id}`), {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
    });
  } catch (e) {
    return NextResponse.json({ message: "Failed to load company", error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();

    const auth = getAuth(req);
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (auth) headers.Authorization = auth;

    const res = await fetch(backendUrl(`/api/v1/platform/companies/${id}`), {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
    });
  } catch (e) {
    return NextResponse.json({ message: "Failed to update company", error: String(e) }, { status: 500 });
  }
}
