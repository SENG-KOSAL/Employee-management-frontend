import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://127.0.0.1:8000";

function joinPath(parts: string[]): string {
  const cleaned = parts.map((p) => String(p || "").replace(/^\/+|\/+$/g, "")).filter(Boolean);
  return `/${cleaned.join("/")}`;
}

function buildUpstreamUrl(req: NextRequest, pathParts: string[]): string {
  const incoming = new URL(req.url);
  const pathname = joinPath(pathParts);
  return `${BACKEND}${pathname}${incoming.search}`;
}

function pickHeader(req: NextRequest, name: string): string | null {
  return req.headers.get(name);
}

function forwardSetCookies(upstreamHeaders: Headers, targetHeaders: Headers) {
  const hdr = upstreamHeaders as Headers & { getSetCookie?: () => string[] };
  if (typeof hdr.getSetCookie === "function") {
    const cookies = hdr.getSetCookie();
    for (const cookie of cookies) {
      targetHeaders.append("set-cookie", cookie);
    }
    return;
  }

  const single = upstreamHeaders.get("set-cookie");
  if (single) targetHeaders.append("set-cookie", single);
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;

  // Prevent proxying to unexpected paths.
  // We only allow backend routes like /api/*.
  if (!Array.isArray(path) || path.length === 0 || path[0] !== "api") {
    return NextResponse.json({ message: "Invalid proxy path" }, { status: 400 });
  }

  const method = req.method.toUpperCase();
  const upstreamUrl = buildUpstreamUrl(req, path);

  const incomingUrl = new URL(req.url);
  const originalHost =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("x-original-host") ||
    req.headers.get("x-tenant-host") ||
    req.headers.get("host") ||
    incomingUrl.host;
  const originalProto =
    req.headers.get("x-forwarded-proto") ||
    req.headers.get("x-original-proto") ||
    incomingUrl.protocol.replace(":", "") ||
    "http";
  const originalPort = req.headers.get("x-forwarded-port") || (originalHost.includes(":") ? originalHost.split(":")[1] : "");

  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  // Preserve tenant host information for backends that resolve tenant/company by host.
  // Laravel will only honor these if TrustProxies is configured.
  if (originalHost) {
    headers["X-Forwarded-Host"] = originalHost;
    headers["X-Original-Host"] = originalHost;
    headers["X-Tenant-Host"] = originalHost;
    // Best-effort: also set Host for the upstream request (server-to-server only).
    headers.Host = originalHost;
  }
  if (originalProto) headers["X-Forwarded-Proto"] = originalProto;
  if (originalPort) headers["X-Forwarded-Port"] = originalPort;

  const authHeader = pickHeader(req, "authorization");
  const cookieToken = req.cookies.get("auth_token")?.value || null;
  const incomingCookieHeader = pickHeader(req, "cookie");
  const effectiveAuth = authHeader || (cookieToken ? `Bearer ${cookieToken}` : null);
  const authSource = authHeader ? "header" : cookieToken ? "cookie" : "none";
  if (effectiveAuth) headers.Authorization = effectiveAuth;
  if (incomingCookieHeader) headers.Cookie = incomingCookieHeader;

  const activeCompany = pickHeader(req, "x-active-company");
  if (activeCompany) headers["X-Active-Company"] = activeCompany;

  const contentType = pickHeader(req, "content-type");
  if (contentType) headers["Content-Type"] = contentType;

  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
  };

  if (method !== "GET" && method !== "HEAD") {
    const body = await req.arrayBuffer();
    // Only attach body if present. Some clients send POST with empty body.
    if (body.byteLength > 0) init.body = body;
  }

  const upstreamRes = await fetch(upstreamUrl, init);
  const buf = await upstreamRes.arrayBuffer();

  const resHeaders = new Headers();
  const upstreamContentType = upstreamRes.headers.get("content-type");
  if (upstreamContentType) resHeaders.set("content-type", upstreamContentType);
  forwardSetCookies(upstreamRes.headers, resHeaders);

  const isDev = process.env.NODE_ENV !== "production";

  // Non-sensitive debug signals to simplify debugging auth issues in the browser.
  // (Helps confirm whether the browser request included auth headers.)
  if (isDev) {
    resHeaders.set("x-proxy-has-authorization", effectiveAuth ? "1" : "0");
    resHeaders.set("x-proxy-auth-source", authSource);
    resHeaders.set("x-proxy-has-active-company", activeCompany ? "1" : "0");
  }

  // If the client only sees the JSON body (e.g., console.log of response data), include debug info
  // for auth/tenant problems without leaking secrets. Dev-only.
  const shouldAugmentBody =
    isDev &&
    (upstreamRes.status === 401 || upstreamRes.status === 403) &&
    typeof upstreamContentType === "string" &&
    upstreamContentType.toLowerCase().includes("application/json");

  if (shouldAugmentBody) {
    try {
      const text = new TextDecoder().decode(buf);
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const rec = parsed as Record<string, unknown>;
        rec.proxy_debug = {
          has_authorization: Boolean(effectiveAuth),
          auth_source: authSource,
          has_authorization_header: Boolean(authHeader),
          has_auth_cookie: Boolean(cookieToken),
          has_cookie_header: Boolean(incomingCookieHeader),
          has_active_company: Boolean(activeCompany),
          original_host: originalHost || null,
          original_proto: originalProto || null,
          upstream_base: BACKEND,
        };
        const next = JSON.stringify(rec);
        return new NextResponse(next, {
          status: upstreamRes.status,
          headers: resHeaders,
        });
      }
    } catch {
      // ignore and fall back to raw
    }
  }

  return new NextResponse(buf, {
    status: upstreamRes.status,
    headers: resHeaders,
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}
