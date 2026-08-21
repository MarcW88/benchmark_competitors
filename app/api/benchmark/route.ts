import { NextRequest, NextResponse } from "next/server";
import { getRankedKeywords, RankedKeyword } from "@/lib/dataforseo";
import { GapKeyword } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { domains, location_code, language_code } = await req.json();

    if (!domains || !Array.isArray(domains) || domains.length < 2) {
      return NextResponse.json(
        { error: "At least 2 domains required" },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      domains.map((domain: string) =>
        getRankedKeywords(domain, location_code, language_code, true)
      )
    );

    const keywordMap = new Map<string, GapKeyword>();

    results.forEach((keywords: RankedKeyword[], idx: number) => {
      const domain = domains[idx];
      keywords.forEach((kw) => {
        if (!keywordMap.has(kw.keyword)) {
          keywordMap.set(kw.keyword, {
            keyword: kw.keyword,
            search_volume: kw.search_volume,
            cpc: kw.cpc,
            keyword_difficulty: kw.keyword_difficulty,
            positions: {},
            urls: {},
          });
        }
        const entry = keywordMap.get(kw.keyword)!;
        entry.positions[domain] = kw.position;
        entry.urls[domain] = kw.url;
        if (kw.search_volume > entry.search_volume) {
          entry.search_volume = kw.search_volume;
        }
      });
    });

    const gap = Array.from(keywordMap.values()).sort(
      (a, b) => b.search_volume - a.search_volume
    );

    return NextResponse.json({ gap, domains, total: gap.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
