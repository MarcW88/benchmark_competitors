import { NextRequest, NextResponse } from "next/server";
import { signPayload } from "@/lib/oauth";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const redirectUri = sp.get("redirect_uri") ?? "";
  const state = sp.get("state") ?? "";
  const codeChallenge = sp.get("code_challenge") ?? "";

  if (!redirectUri) {
    return NextResponse.json({ error: "missing redirect_uri" }, { status: 400, headers: CORS });
  }

  const code = signPayload({ codeChallenge, redirectUri, ts: Date.now() });

  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString(), { headers: CORS });
}
