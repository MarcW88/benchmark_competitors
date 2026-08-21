import { NextRequest, NextResponse } from "next/server";
import { getRankedKeywords } from "@/lib/dataforseo";

export async function POST(req: NextRequest) {
  try {
    const { target, location_code, language_code, only_organic } =
      await req.json();

    if (!target || !location_code || !language_code) {
      return NextResponse.json(
        { error: "target, location_code and language_code are required" },
        { status: 400 }
      );
    }

    const keywords = await getRankedKeywords(
      target,
      location_code,
      language_code,
      only_organic ?? true
    );

    return NextResponse.json({ keywords, total: keywords.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
