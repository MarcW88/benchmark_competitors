import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/.well-known/oauth-authorization-server") {
    const base = req.nextUrl.origin;
    return NextResponse.json(
      {
        issuer: base,
        authorization_endpoint: `${base}/api/oauth/authorize`,
        token_endpoint: `${base}/api/oauth/token`,
        registration_endpoint: `${base}/api/oauth/register`,
        scopes_supported: ["mcp"],
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code"],
        code_challenge_methods_supported: ["S256"],
        token_endpoint_auth_methods_supported: ["none"],
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Content-Type": "application/json",
        },
      }
    );
  }
}

export const config = {
  matcher: ["/.well-known/:path*"],
};
