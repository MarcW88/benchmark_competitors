import { NextRequest, NextResponse } from "next/server";
import { signPayload } from "@/lib/oauth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const clientId = signPayload({ redirect_uris: body.redirect_uris ?? [], ts: Date.now() });
  return NextResponse.json({
    client_id: clientId,
    client_secret: "public",
    redirect_uris: body.redirect_uris ?? [],
    grant_types: ["authorization_code"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  });
}
