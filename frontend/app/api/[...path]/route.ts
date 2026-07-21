// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const HOP_BY_HOP_HEADERS = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "content-length",
    // Node's fetch() transparently decompresses gzip/br responses, so the
    // body we forward to the browser is already plain. Leaving
    // content-encoding intact made the browser try to gunzip plain text
    // and fail with ERR_CONTENT_DECODING_FAILED.
    "content-encoding",
]);

const SAME_ORIGIN_SENTINELS = new Set(["/api", "api", "same-origin", "same_origin", "relative"]);

function normalizeBackendOrigin(raw: string): string {
    const candidates = (raw || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    const selected = candidates.find((item) => /^https?:\/\//i.test(item)) || "";
    if (!selected) return "";
    return selected.replace(/\/+$/, "").replace(/\/api$/i, "");
}

function normalizeHostWithPort(rawHost: string): string {
    return (rawHost || "").trim().toLowerCase();
}

function isLikelyProxyLoop(request: NextRequest, backendOrigin: string): boolean {
    let target: URL;
    try {
        target = new URL(backendOrigin);
    } catch {
        return false;
    }

    const requestHost = normalizeHostWithPort(request.headers.get("host") || request.nextUrl.host);
    const targetHost = normalizeHostWithPort(target.host);

    if (!requestHost || !targetHost) {
        return false;
    }

    // Exact host match means /api proxy points back to this same Next.js app.
    if (requestHost === targetHost) {
        return true;
    }

    // Also guard against common www/non-www loop.
    const requestNoWww = requestHost.replace(/^www\./, "");
    const targetNoWww = targetHost.replace(/^www\./, "");
    return requestNoWww === targetNoWww;
}

function resolveBackendOrigin(): string {
    const explicit = normalizeBackendOrigin(process.env.BACKEND_API_ORIGIN || process.env.API_PROXY_TARGET || "");
    if (explicit) return explicit;

    // Backward compatibility if someone mistakenly sets NEXT_PUBLIC_API_URL to absolute value.
    const fallback = (process.env.NEXT_PUBLIC_API_URL || "").trim().toLowerCase();
    if (SAME_ORIGIN_SENTINELS.has(fallback)) return "";
    return normalizeBackendOrigin(process.env.NEXT_PUBLIC_API_URL || "");
}

function buildBackendApiPath(pathParts: string[]): string {
    const joined = (pathParts || []).join("/").replace(/^\/+/, "");
    if (!joined) {
        return "api/";
    }

    // Preserve file-like paths as-is, append trailing slash for API resource routes.
    const isFileLike = /\/[^/]+\.[^/]+$/.test(`/${joined}`);
    if (joined.endsWith("/") || isFileLike) {
        return `api/${joined}`;
    }
    return `api/${joined}/`;
}

function buildTargetUrl(request: NextRequest, pathParts: string[]): URL | null {
    const backendOrigin = resolveBackendOrigin();
    if (!backendOrigin) return null;

    const base = `${backendOrigin}/`;
    const targetUrl = new URL(buildBackendApiPath(pathParts), base);
    targetUrl.search = request.nextUrl.search;
    return targetUrl;
}

function normalizeCookieToken(rawValue: string): string {
    const raw = (rawValue || "").trim();
    if (!raw) return "";
    try {
        return decodeURIComponent(raw).trim();
    } catch {
        return raw;
    }
}

function buildForwardHeaders(request: NextRequest): Headers {
    const headers = new Headers(request.headers);
    for (const header of HOP_BY_HOP_HEADERS) {
        headers.delete(header);
    }
    headers.delete("host");

    // Tokens live in httpOnly cookies the browser cannot read, so the proxy
    // attaches them to backend requests. Explicit Authorization headers
    // (e.g. from the mobile app or tests) always win.
    if (!headers.get("authorization")) {
        const accessToken = normalizeCookieToken(request.cookies.get("access_token")?.value || "");
        if (accessToken) {
            headers.set("authorization", `Bearer ${accessToken}`);
        }
    }

    const originalHost = request.headers.get("host");
    if (originalHost) {
        // Explicitly preserve browser host for backend tenant resolution.
        // Some upstream proxies may rewrite/append x-forwarded-host.
        headers.set("x-tenant-host", originalHost);
        headers.set("x-forwarded-host", originalHost);
    }
    headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));
    return headers;
}

async function proxyRequest(request: NextRequest, pathParts: string[]): Promise<NextResponse> {
    const backendOrigin = resolveBackendOrigin();
    if (!backendOrigin) {
        const response = NextResponse.json(
            {
                code: "backend_origin_missing",
                message: "Set BACKEND_API_ORIGIN (or API_PROXY_TARGET) to your Railway backend origin.",
            },
            { status: 500 },
        );
        response.headers.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
        return response;
    }

    if (isLikelyProxyLoop(request, backendOrigin)) {
        const response = NextResponse.json(
            {
                code: "backend_origin_loop",
                message:
                    "BACKEND_API_ORIGIN points to the frontend host. Set it to the Railway backend origin.",
            },
            { status: 500 },
        );
        response.headers.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
        return response;
    }

    const targetUrl = buildTargetUrl(request, pathParts);
    if (!targetUrl) {
        const response = NextResponse.json(
            {
                code: "backend_origin_missing",
                message: "Set BACKEND_API_ORIGIN (or API_PROXY_TARGET) to your Railway backend origin.",
            },
            { status: 500 },
        );
        response.headers.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
        return response;
    }

    const method = request.method.toUpperCase();
    const hasBody = method !== "GET" && method !== "HEAD";
    const forwardHeaders = buildForwardHeaders(request);

    let upstreamResponse: Response;
    try {
        upstreamResponse = await fetch(targetUrl, {
            method,
            headers: forwardHeaders,
            body: hasBody ? await request.arrayBuffer() : undefined,
            // Keep redirect handling explicit to avoid POST -> GET rewrites on 301/302.
            redirect: "manual",
            cache: "no-store",
        });
    } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown upstream error";
        const response = NextResponse.json(
            {
                code: "backend_proxy_failed",
                message: "Backend API request failed.",
                detail,
            },
            { status: 502 },
        );
        response.headers.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
        return response;
    }

    const responseHeaders = new Headers(upstreamResponse.headers);
    for (const header of HOP_BY_HOP_HEADERS) {
        responseHeaders.delete(header);
    }
    responseHeaders.set("x-api-proxy", "nextjs-route-handler");
    responseHeaders.set("x-backend-origin", backendOrigin);
    responseHeaders.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");

    return new NextResponse(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: responseHeaders,
    });
}

type RouteParams = { path?: string[] };
type RouteContext = { params: RouteParams | Promise<RouteParams> };

async function handle(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    const params = await Promise.resolve(context.params);
    const { path } = params;
    return proxyRequest(request, path || []);
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    return handle(request, context);
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    return handle(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    return handle(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    return handle(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    return handle(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    return handle(request, context);
}
