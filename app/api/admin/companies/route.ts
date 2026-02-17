import { NextResponse } from "next/server";

/**
 * /api/admin/companies
 *
 * Frontend contract requested:
 * - GET  /admin/companies  -> list companies
 * - POST /admin/companies  -> create company
 *
 * Implementation:
 * - Proxies to backend platform routes (Sanctum PAT):
 *   - GET  /api/v1/platform/companies
 *   - POST /api/v1/platform/companies
 */

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function backendUrl(pathname: string, search: string) {
  return `${BACKEND}${pathname}${search || ""}`;
}

function getAuth(req: Request): string | null {
  return req.headers.get("authorization");
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auth = getAuth(req);
    const headers: Record<string, string> = { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" };
    if (auth) headers.Authorization = auth;

    const res = await fetch(backendUrl("/api/v1/platform/companies", url.search), {
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
    return NextResponse.json({ message: "Failed to load companies", error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const auth = getAuth(req);
    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "Content-Type": "application/json",
    };
    if (auth) headers.Authorization = auth;

    const res = await fetch(backendUrl("/api/v1/platform/companies", ""), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
    });
  } catch (e) {
    return NextResponse.json({ message: "Failed to create company", error: String(e) }, { status: 500 });
  }
}
