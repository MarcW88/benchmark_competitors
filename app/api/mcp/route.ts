import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { NextRequest } from "next/server";

export const maxDuration = 60;

const LOGIN = process.env.DATAFORSEO_LOGIN ?? "";
const PASSWORD = process.env.DATAFORSEO_PASSWORD ?? "";
const BASE = "https://api.dataforseo.com/v3";

const LOCATIONS: Record<string, { location_code: number; language_code: string }> = {
  "belgium-fr":  { location_code: 2056, language_code: "fr" },
  "belgium-nl":  { location_code: 2056, language_code: "nl" },
  "france":      { location_code: 2250, language_code: "fr" },
  "luxembourg":  { location_code: 2442, language_code: "fr" },
  "switzerland": { location_code: 2756, language_code: "fr" },
  "netherlands": { location_code: 2528, language_code: "nl" },
  "usa":         { location_code: 2840, language_code: "en" },
  "uk":          { location_code: 2826, language_code: "en" },
};

async function dfsPost(endpoint: string, body: object[]) {
  const creds = Buffer.from(`${LOGIN}:${PASSWORD}`).toString("base64");
  const res = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`DataForSEO ${res.status}`);
  return res.json();
}

async function fetchPages(endpoint: string, task: object, max = 200) {
  const items: object[] = [];
  let offset = 0;
  const limit = 100;
  while (items.length < max) {
    const data = await dfsPost(endpoint, [{ ...task, offset, limit }]);
    const result = data?.tasks?.[0]?.result?.[0];
    const batch: object[] = result?.items ?? [];
    items.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  return items as any[];
}

function loc(location: string) {
  return LOCATIONS[location?.toLowerCase().replace(/\s+/g, "-")] ?? LOCATIONS["belgium-fr"];
}

async function rankedReport(domain: string, location: string, brand: string, limit: number) {
  const l = loc(location);
  const items = await fetchPages("/serp/google/organic/live/regular",
    { target: domain, location_code: l.location_code, language_code: l.language_code }, limit);

  const top3 = items.filter(k => k.rank_group <= 3).length;
  const top10 = items.filter(k => k.rank_group <= 10).length;
  const top20 = items.filter(k => k.rank_group <= 20).length;
  const traffic = Math.round(items.reduce((s, k) => s + (k.traffic_percent ?? 0), 0));
  const branded = brand ? items.filter(k => k.keyword.toLowerCase().includes(brand.toLowerCase())) : [];
  const top20kws = [...items].sort((a, b) => a.rank_group - b.rank_group).slice(0, 20);

  let md = `# SEO Report — ${domain}\n**Location:** ${location}\n\n`;
  md += `## Overview\n| Metric | Value |\n|---|---|\n`;
  md += `| Top 3 | ${top3} |\n| Top 10 | ${top10} |\n| Top 20 | ${top20} |\n`;
  md += `| Total (Top 100) | ${items.length} |\n| Est. Traffic | ${traffic.toLocaleString()} |\n\n`;

  if (brand) {
    md += `## Brand vs Non-Brand ("${brand}")\n| Type | Count | % |\n|---|---|---|\n`;
    md += `| Branded | ${branded.length} | ${items.length ? ((branded.length / items.length) * 100).toFixed(1) : 0}% |\n`;
    md += `| Non-Branded | ${items.length - branded.length} | ${items.length ? (((items.length - branded.length) / items.length) * 100).toFixed(1) : 0}% |\n\n`;
  }

  md += `## Top 20 Keywords\n| # | Keyword | Position | Volume | CPC | KD |\n|---|---|---|---|---|---|\n`;
  top20kws.forEach((k, i) => {
    md += `| ${i + 1} | ${k.keyword} | #${k.rank_group} | ${(k.search_volume ?? 0).toLocaleString()} | $${(k.cpc ?? 0).toFixed(2)} | ${k.keyword_difficulty ?? "—"} |\n`;
  });
  return md;
}

async function gapReport(mainDomain: string, competitors: string[], location: string, brand: string, limit: number) {
  const l = loc(location);
  const allDomains = [mainDomain, ...competitors];
  const maps: Map<string, any>[] = [];

  for (const domain of allDomains) {
    const items = await fetchPages("/serp/google/organic/live/regular",
      { target: domain, location_code: l.location_code, language_code: l.language_code }, limit);
    const map = new Map<string, any>();
    items.forEach(item => map.set(item.keyword, item));
    maps.push(map);
  }

  const allKws = new Set<string>();
  maps.forEach(m => m.forEach((_, k) => allKws.add(k)));

  const gaps: { keyword: string; volume: number; kd: number; positions: Record<string, number | null> }[] = [];
  allKws.forEach(kw => {
    const positions: Record<string, number | null> = {};
    allDomains.forEach((d, i) => { positions[d] = maps[i].get(kw)?.rank_group ?? null; });
    const src = maps.find(m => m.has(kw))?.get(kw);
    gaps.push({ keyword: kw, volume: src?.search_volume ?? 0, kd: src?.keyword_difficulty ?? 0, positions });
  });

  const gapOnly = gaps
    .filter(k => !k.positions[mainDomain] && competitors.some(d => k.positions[d]))
    .sort((a, b) => b.volume - a.volume);
  const shared = gaps.filter(k => k.positions[mainDomain] && competitors.some(d => k.positions[d])).length;

  const display = brand
    ? gapOnly.filter(k => !k.keyword.toLowerCase().includes(brand.toLowerCase())).slice(0, 30)
    : gapOnly.slice(0, 30);

  let md = `# Keyword Gap — ${mainDomain} vs ${competitors.join(", ")}\n**Location:** ${location}\n\n`;
  md += `## Summary\n| Metric | Value |\n|---|---|\n`;
  md += `| Total unique keywords | ${allKws.size.toLocaleString()} |\n`;
  md += `| Keyword gap | ${gapOnly.length.toLocaleString()} |\n`;
  md += `| Shared keywords | ${shared.toLocaleString()} |\n\n`;

  if (brand) {
    const brandedGap = gapOnly.filter(k => k.keyword.toLowerCase().includes(brand.toLowerCase()));
    md += `## Brand split in gaps\n| Type | Count |\n|---|---|\n`;
    md += `| Branded gap | ${brandedGap.length} |\n`;
    md += `| Non-branded gap | ${gapOnly.length - brandedGap.length} |\n\n`;
  }

  md += `## Top 30 Opportunities${brand ? ` (non-branded)` : ""}\n`;
  md += `| Keyword | Volume | KD | ${competitors.join(" | ")} |\n|---|---|---|${"---|".repeat(competitors.length)}\n`;
  display.forEach(k => {
    const cols = competitors.map(d => k.positions[d] ? `#${k.positions[d]}` : "—").join(" | ");
    md += `| ${k.keyword} | ${k.volume.toLocaleString()} | ${k.kd} | ${cols} |\n`;
  });
  return md;
}

function createMcpServer() {
  const server = new Server(
    { name: "competitor-benchmark", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "ranked_keywords",
        description: "Fetch all keywords a domain ranks for on Google and return a full SEO report with stats, brand/non-brand split and top keywords.",
        inputSchema: {
          type: "object",
          properties: {
            domain: { type: "string", description: "Domain to analyse, e.g. decathlon.be" },
            location: { type: "string", description: "Preset: belgium-fr, belgium-nl, france, luxembourg, switzerland, netherlands, usa, uk", default: "belgium-fr" },
            brand: { type: "string", description: "Brand name for brand/non-brand split", default: "" },
            limit: { type: "number", description: "Max keywords to fetch (default 200)", default: 200 },
          },
          required: ["domain"],
        },
      },
      {
        name: "keyword_gap",
        description: "Compare a main domain vs competitors and identify keyword opportunities the main domain is missing.",
        inputSchema: {
          type: "object",
          properties: {
            main_domain: { type: "string", description: "Your domain" },
            competitor_domains: { type: "array", items: { type: "string" }, description: "List of competitor domains" },
            location: { type: "string", default: "belgium-fr" },
            brand: { type: "string", description: "Brand name to filter out branded gap keywords", default: "" },
            limit: { type: "number", description: "Max keywords per domain (default 150)", default: 150 },
          },
          required: ["main_domain", "competitor_domains"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    if (!LOGIN || !PASSWORD) {
      return { content: [{ type: "text", text: "❌ Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD env variables in Vercel." }], isError: true };
    }
    try {
      let result = "";
      if (name === "ranked_keywords") {
        result = await rankedReport(args!.domain as string, (args!.location as string) ?? "belgium-fr", (args!.brand as string) ?? "", (args!.limit as number) ?? 200);
      } else if (name === "keyword_gap") {
        result = await gapReport(args!.main_domain as string, args!.competitor_domains as string[], (args!.location as string) ?? "belgium-fr", (args!.brand as string) ?? "", (args!.limit as number) ?? 150);
      } else {
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
      }
      return { content: [{ type: "text", text: result }] };
    } catch (err: unknown) {
      return { content: [{ type: "text", text: `❌ ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  });

  return server;
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, MCP-Session-Id, MCP-Protocol-Version");
  return new Response(response.body, { status: response.status, headers });
}

async function handle(req: NextRequest): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = createMcpServer();
  await server.connect(transport);
  const response = await transport.handleRequest(req);
  await server.close().catch(() => {});
  return withCors(response);
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
export async function DELETE(req: NextRequest) { return handle(req); }
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, MCP-Session-Id, MCP-Protocol-Version",
    },
  });
}
