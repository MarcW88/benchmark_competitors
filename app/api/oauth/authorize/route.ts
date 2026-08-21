import { NextRequest, NextResponse } from "next/server";
import { signPayload } from "@/lib/oauth";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const redirectUri = searchParams.get("redirect_uri") ?? "";
  const state = searchParams.get("state") ?? "";
  const codeChallenge = searchParams.get("code_challenge") ?? "";
  const clientId = searchParams.get("client_id") ?? "";

  if (!redirectUri) {
    return NextResponse.json({ error: "missing redirect_uri" }, { status: 400 });
  }

  const code = signPayload({ clientId, redirectUri, codeChallenge, ts: Date.now() });

  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
