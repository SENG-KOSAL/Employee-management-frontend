import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const incomingUrl = new URL(request.url);
    const originalHost =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("x-original-host") ||
      request.headers.get("x-tenant-host") ||
      request.headers.get("host") ||
      incomingUrl.host;
    const originalProto =
      request.headers.get("x-forwarded-proto") ||
      request.headers.get("x-original-proto") ||
      incomingUrl.protocol.replace(":", "") ||
      "http";

    const upstream = await fetch(`${BACKEND}/api/v1/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(originalHost ? { "X-Forwarded-Host": originalHost, "X-Original-Host": originalHost, "X-Tenant-Host": originalHost, Host: originalHost } : {}),
        ...(originalProto ? { "X-Forwarded-Proto": originalProto } : {}),
      },
      body: JSON.stringify(body ?? {}),
    });

    const text = await upstream.text();
    const res = new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json",
      },
    });

    // If backend returns a bearer token, store it in an httpOnly cookie as well.
    // This allows the same-origin proxy (/api/proxy/*) to attach Authorization server-side.
    if (upstream.ok) {
      try {
        const parsed = JSON.parse(text) as any;
        const token =
          parsed?.token ??
          parsed?.data?.token ??
          parsed?.access_token ??
          parsed?.data?.access_token ??
          null;

        if (typeof token === "string" && token.length > 0) {
          res.cookies.set("auth_token", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
          });
        }
      } catch {
        // ignore
      }
    }

    return res;
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: "Login proxy failed", error: String(e) },
      { status: 500 }
    );
  }
}
