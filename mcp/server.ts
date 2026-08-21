#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const LOGIN = process.env.DATAFORSEO_LOGIN ?? "";
const PASSWORD = process.env.DATAFORSEO_PASSWORD ?? "";
const BASE = "https://api.dataforseo.com/v3";

const LOCATIONS: Record<string, { location_code: number; language_code: string }> = {
  "belgium-fr":   { location_code: 2056, language_code: "fr" },
  "belgium-nl":   { location_code: 2056, language_code: "nl" },
  "france":       { location_code: 2250, language_code: "fr" },
  "luxembourg":   { location_code: 2442, language_code: "fr" },
  "switzerland":  { location_code: 2756, language_code: "fr" },
  "netherlands":  { location_code: 2528, language_code: "nl" },
  "usa":          { location_code: 2840, language_code: "en" },
  "uk":           { location_code: 2826, language_code: "en" },
};

async function dfsPost(endpoint: string, body: object[]) {
  const creds = Buffer.from(`${LOGIN}:${PASSWORD}`).toString("base64");
  const res = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`DataForSEO error ${res.status}: ${res.statusText}`);
  return res.json();
}

async function fetchAllPages(
  endpoint: string,
  baseTask: object,
  maxItems = 1000
): Promise<object[]> {
  const items: object[] = [];
  let offset = 0;
  const limit = 100;

  while (items.length < maxItems) {
    const data = await dfsPost(endpoint, [{ ...baseTask, offset, limit }]);
    const result = data?.tasks?.[0]?.result?.[0];
    const batch: object[] = result?.items ?? [];
    items.push(...batch);
    if (batch.length < limit || items.length >= (result?.total_count ?? 0)) break;
    offset += limit;
  }
  return items;
}

function resolveLocation(loc: string): { location_code: number; language_code: string } {
  const key = loc.toLowerCase().replace(/\s+/g, "-");
  return LOCATIONS[key] ?? LOCATIONS["belgium-fr"];
}

function isBranded(keyword: string, brand: string): boolean {
  return brand ? keyword.toLowerCase().includes(brand.toLowerCase()) : false;
}

function formatNumber(n: number): string {
  return n.toLocaleString("fr-BE");
}

// ─── TOOL HANDLERS ────────────────────────────────────────────────────────────

async function rankedKeywordsReport(
  domain: string,
  location: string,
  brand: string,
  limit: number
) {
  const loc = resolveLocation(location);
  const items: any[] = await fetchAllPages(
    "/serp/google/organic/live/regular",
    {
      target: domain,
      location_code: loc.location_code,
      language_code: loc.language_code,
      include_serp_info: false,
    },
    limit
  ) as any[];

  const top3 = items.filter((k) => k.rank_group <= 3).length;
  const top10 = items.filter((k) => k.rank_group <= 10).length;
  const top20 = items.filter((k) => k.rank_group <= 20).length;
  const totalTraffic = Math.round(items.reduce((s: number, k: any) => s + (k.traffic_percent ?? 0), 0));

  const branded = brand ? items.filter((k) => isBranded(k.keyword, brand)) : [];
  const nonBranded = brand ? items.filter((k) => !isBranded(k.keyword, brand)) : items;

  const topKws = [...items]
    .sort((a: any, b: any) => a.rank_group - b.rank_group)
    .slice(0, 20);

  let md = `# SEO Report — ${domain}\n`;
  md += `**Location:** ${location} | **Keywords analysed:** ${items.length.toLocaleString()}\n\n`;

  md += `## 📊 Overview\n`;
  md += `| Metric | Value |\n|---|---|\n`;
  md += `| Top 3 | ${top3} |\n`;
  md += `| Top 10 | ${top10} |\n`;
  md += `| Top 20 | ${top20} |\n`;
  md += `| Total (Top 100) | ${items.length} |\n`;
  md += `| Est. Monthly Traffic | ${formatNumber(totalTraffic)} |\n\n`;

  if (brand) {
    md += `## 🏷 Brand vs Non-Brand (brand: "${brand}")\n`;
    md += `| Type | Count | % |\n|---|---|---|\n`;
    md += `| Branded | ${branded.length} | ${((branded.length / items.length) * 100).toFixed(1)}% |\n`;
    md += `| Non-Branded | ${nonBranded.length} | ${((nonBranded.length / items.length) * 100).toFixed(1)}% |\n\n`;
  }

  md += `## 🔑 Top 20 Keywords\n`;
  md += `| # | Keyword | Position | Volume | CPC | KD |\n|---|---|---|---|---|---|\n`;
  topKws.forEach((k: any, i: number) => {
    md += `| ${i + 1} | ${k.keyword} | #${k.rank_group} | ${(k.search_volume ?? 0).toLocaleString()} | $${(k.cpc ?? 0).toFixed(2)} | ${k.keyword_difficulty ?? "—"} |\n`;
  });

  return md;
}

async function keywordGapReport(
  mainDomain: string,
  competitorDomains: string[],
  location: string,
  brand: string,
  limit: number
) {
  const loc = resolveLocation(location);
  const allDomains = [mainDomain, ...competitorDomains];
  const kwMaps: Map<string, any>[] = [];

  for (const domain of allDomains) {
    const items = await fetchAllPages(
      "/serp/google/organic/live/regular",
      {
        target: domain,
        location_code: loc.location_code,
        language_code: loc.language_code,
        include_serp_info: false,
      },
      limit
    ) as any[];
    const map = new Map<string, any>();
    for (const item of items) map.set(item.keyword, item);
    kwMaps.push(map);
  }

  const allKeywords = new Set<string>();
  kwMaps.forEach((m) => m.forEach((_, k) => allKeywords.add(k)));

  const mainMap = kwMaps[0];
  const gapKeywords: { keyword: string; volume: number; kd: number; positions: Record<string, number | null> }[] = [];

  allKeywords.forEach((kw) => {
    const positions: Record<string, number | null> = {};
    allDomains.forEach((d, i) => {
      const item = kwMaps[i].get(kw);
      positions[d] = item ? item.rank_group : null;
    });
    const volumeSource = kwMaps.find((m) => m.has(kw))?.get(kw);
    gapKeywords.push({
      keyword: kw,
      volume: volumeSource?.search_volume ?? 0,
      kd: volumeSource?.keyword_difficulty ?? 0,
      positions,
    });
  });

  const gaps = gapKeywords
    .filter((k) => !k.positions[mainDomain] && competitorDomains.some((d) => k.positions[d]))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 30);

  const shared = gapKeywords.filter(
    (k) => k.positions[mainDomain] && competitorDomains.some((d) => k.positions[d])
  ).length;

  const brandedGaps = brand ? gaps.filter((k) => isBranded(k.keyword, brand)) : [];
  const nonBrandedGaps = brand ? gaps.filter((k) => !isBranded(k.keyword, brand)) : gaps;

  let md = `# Keyword Gap Report — ${mainDomain} vs ${competitorDomains.join(", ")}\n`;
  md += `**Location:** ${location}\n\n`;

  md += `## 📊 Summary\n`;
  md += `| Metric | Value |\n|---|---|\n`;
  md += `| Total unique keywords | ${allKeywords.size.toLocaleString()} |\n`;
  md += `| Keyword gap (competitors rank, you don't) | ${gapKeywords.filter((k) => !k.positions[mainDomain] && competitorDomains.some((d) => k.positions[d])).length.toLocaleString()} |\n`;
  md += `| Shared keywords | ${shared.toLocaleString()} |\n\n`;

  if (brand) {
    md += `## 🏷 Brand Split in Gap Keywords\n`;
    md += `| Type | Count |\n|---|---|\n`;
    md += `| Branded gap | ${brandedGaps.length} |\n`;
    md += `| Non-branded gap | ${nonBrandedGaps.length} |\n\n`;
  }

  md += `## 🎯 Top 30 Opportunities (${brand ? "non-branded " : ""}keywords competitors rank for, ${mainDomain} doesn't)\n`;
  md += `| Keyword | Volume | KD | ${competitorDomains.join(" | ")} |\n|---|---|---|${"---|".repeat(competitorDomains.length)}\n`;
  const displayGaps = brand ? nonBrandedGaps.slice(0, 30) : gaps.slice(0, 30);
  displayGaps.forEach((k) => {
    const compCols = competitorDomains.map((d) => (k.positions[d] ? `#${k.positions[d]}` : "—")).join(" | ");
    md += `| ${k.keyword} | ${k.volume.toLocaleString()} | ${k.kd} | ${compCols} |\n`;
  });

  return md;
}

async function historicalReport(domain: string, location: string, dateFrom: string, dateTo: string) {
  const loc = resolveLocation(location);
  const data = await dfsPost("/serp/google/organic/live/regular", [
    {
      target: domain,
      location_code: loc.location_code,
      language_code: loc.language_code,
      date_from: dateFrom,
      date_to: dateTo,
    },
  ]);

  const items: any[] = data?.tasks?.[0]?.result?.[0]?.items ?? [];

  let md = `# Historical Rank Overview — ${domain}\n`;
  md += `**Period:** ${dateFrom} → ${dateTo} | **Location:** ${location}\n\n`;
  md += `| Keyword | Position | Volume | Traffic |\n|---|---|---|---|\n`;
  items.slice(0, 30).forEach((k: any) => {
    md += `| ${k.keyword} | #${k.rank_group} | ${(k.search_volume ?? 0).toLocaleString()} | ${(k.traffic_percent ?? 0).toFixed(1)}% |\n`;
  });

  return md;
}

// ─── MCP SERVER ───────────────────────────────────────────────────────────────

const server = new Server(
  { name: "competitor-benchmark", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "ranked_keywords",
      description:
        "Fetch all keywords a domain ranks for on Google (organic). Returns a full markdown report with stats, brand/non-brand split, and top 20 keywords.",
      inputSchema: {
        type: "object",
        properties: {
          domain: { type: "string", description: "Domain to analyse, e.g. decathlon.be" },
          location: {
            type: "string",
            description:
              "Market/language preset: belgium-fr, belgium-nl, france, luxembourg, switzerland, netherlands, usa, uk",
            default: "belgium-fr",
          },
          brand: {
            type: "string",
            description: "Brand name for brand/non-brand split, e.g. decathlon",
            default: "",
          },
          limit: {
            type: "number",
            description: "Max keywords to fetch (default 500, max 2000)",
            default: 500,
          },
        },
        required: ["domain"],
      },
    },
    {
      name: "keyword_gap",
      description:
        "Compare a main domain against competitors. Returns a gap analysis showing which keywords competitors rank for that the main domain doesn't, with volume and difficulty data.",
      inputSchema: {
        type: "object",
        properties: {
          main_domain: { type: "string", description: "Your domain, e.g. decathlon.be" },
          competitor_domains: {
            type: "array",
            items: { type: "string" },
            description: "Competitor domains, e.g. ['sport2000.be', 'intersport.be']",
          },
          location: {
            type: "string",
            description: "Market preset: belgium-fr, belgium-nl, france, luxembourg, switzerland, netherlands, usa, uk",
            default: "belgium-fr",
          },
          brand: {
            type: "string",
            description: "Brand name to separate branded gap from non-branded opportunities",
            default: "",
          },
          limit: {
            type: "number",
            description: "Max keywords to fetch per domain (default 300)",
            default: 300,
          },
        },
        required: ["main_domain", "competitor_domains"],
      },
    },
    {
      name: "historical_rank_overview",
      description:
        "Get historical ranking data for a domain between two dates.",
      inputSchema: {
        type: "object",
        properties: {
          domain: { type: "string", description: "Domain to analyse" },
          location: { type: "string", default: "belgium-fr" },
          date_from: { type: "string", description: "Start date YYYY-MM-DD" },
          date_to: { type: "string", description: "End date YYYY-MM-DD" },
        },
        required: ["domain", "date_from", "date_to"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  try {
    if (!LOGIN || !PASSWORD) {
      return {
        content: [{ type: "text", text: "❌ Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD environment variables." }],
        isError: true,
      };
    }

    let result = "";

    if (name === "ranked_keywords") {
      result = await rankedKeywordsReport(
        args!.domain as string,
        (args!.location as string) ?? "belgium-fr",
        (args!.brand as string) ?? "",
        (args!.limit as number) ?? 500
      );
    } else if (name === "keyword_gap") {
      result = await keywordGapReport(
        args!.main_domain as string,
        args!.competitor_domains as string[],
        (args!.location as string) ?? "belgium-fr",
        (args!.brand as string) ?? "",
        (args!.limit as number) ?? 300
      );
    } else if (name === "historical_rank_overview") {
      result = await historicalReport(
        args!.domain as string,
        (args!.location as string) ?? "belgium-fr",
        args!.date_from as string,
        args!.date_to as string
      );
    } else {
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }

    return { content: [{ type: "text", text: result }] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `❌ Error: ${msg}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("Competitor Benchmark MCP server running\n");
}

main().catch((e) => {
  process.stderr.write(`Fatal: ${e}\n`);
  process.exit(1);
});
