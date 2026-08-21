import { NextRequest, NextResponse } from "next/server";
import { verifyPayload, signPayload, sha256Base64url } from "@/lib/oauth";

export async function POST(req: NextRequest) {
  let body: Record<string, string> = {};
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    body = Object.fromEntries(new URLSearchParams(text));
  } else {
    body = await req.json().catch(() => ({}));
  }

  const { code, code_verifier, grant_type } = body;

  if (grant_type !== "authorization_code") {
    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "missing_code" }, { status: 400 });
  }

  const payload = verifyPayload(code) as { clientId: string; redirectUri: string; codeChallenge: string; ts: number } | null;
  if (!payload) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  if (Date.now() - payload.ts > 5 * 60 * 1000) {
    return NextResponse.json({ error: "code_expired" }, { status: 400 });
  }

  if (payload.codeChallenge && code_verifier) {
    const computed = sha256Base64url(code_verifier);
    if (computed !== payload.codeChallenge) {
      return NextResponse.json({ error: "invalid_code_verifier" }, { status: 400 });
    }
  }

  const accessToken = signPayload({ clientId: payload.clientId, issued: Date.now() });

  return NextResponse.json({
    access_token: accessToken,
    token_type: "Bearer",
    scope: "mcp",
  });
}
