"use client";

import { useState } from "react";
import { Plus, X, BarChart3, GitCompareArrows, Loader2, AlertCircle } from "lucide-react";
import StatsCards from "@/components/StatsCards";
import KeywordsTable from "@/components/KeywordsTable";
import KeywordGap from "@/components/KeywordGap";
import { RankedKeyword } from "@/lib/dataforseo";
import { GapKeyword } from "@/lib/types";

const LOCATIONS = [
  { label: "Belgium (FR)", code: 2056, lang: "fr" },
  { label: "Belgium (NL)", code: 2056, lang: "nl" },
  { label: "France", code: 2250, lang: "fr" },
  { label: "Luxembourg", code: 2442, lang: "fr" },
  { label: "Switzerland (FR)", code: 2756, lang: "fr" },
  { label: "Netherlands", code: 2528, lang: "nl" },
  { label: "United States", code: 2840, lang: "en" },
  { label: "United Kingdom", code: 2826, lang: "en" },
  { label: "Germany", code: 2276, lang: "de" },
];

type Mode = "ranked" | "relevant" | "benchmark";
type Tab = "keywords" | "gap";

interface RankedResult {
  domain: string;
  keywords: RankedKeyword[];
  total: number;
}

interface BenchmarkResult {
  gap: GapKeyword[];
  domains: string[];
  total: number;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("ranked");
  const [domain, setDomain] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([""]);
  const [locationIdx, setLocationIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rankedResult, setRankedResult] = useState<RankedResult | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("keywords");

  const loc = LOCATIONS[locationIdx];

  async function run() {
    if (!domain.trim()) return;
    setLoading(true);
    setError(null);
    setRankedResult(null);
    setBenchmarkResult(null);

    try {
      if (mode === "ranked" || mode === "relevant") {
        const endpoint =
          mode === "ranked"
            ? "/api/ranked-keywords"
            : "/api/keywords-for-site";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: domain.trim(),
            location_code: loc.code,
            language_code: loc.lang,
            only_organic: true,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setRankedResult({
          domain: domain.trim(),
          keywords: data.keywords,
          total: data.total,
        });
        setActiveTab("keywords");
      } else {
        const allDomains = [domain.trim(), ...competitors.map((c) => c.trim()).filter(Boolean)];
        const res = await fetch("/api/benchmark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domains: allDomains,
            location_code: loc.code,
            language_code: loc.lang,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setBenchmarkResult(data);
        setActiveTab("gap");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const hasResults = !!rankedResult || !!benchmarkResult;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-blue-400" />
        <h1 className="text-lg font-semibold tracking-tight">
          Competitor Benchmark
        </h1>
        <span className="ml-1 text-xs text-slate-500 font-normal">
          powered by DataForSEO
        </span>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Config panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6">
          {/* Mode */}
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wide mb-2">
              Mode
            </label>
            <div className="flex gap-2">
              {(
                [
                  { key: "ranked", label: "Ranking Keywords" },
                  { key: "relevant", label: "Relevant Keywords" },
                  { key: "benchmark", label: "Multi-domain Benchmark" },
                ] as { key: Mode; label: string }[]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === key
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700"
                  }`}
                >
                  {key === "benchmark" && (
                    <GitCompareArrows className="w-4 h-4" />
                  )}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Domain inputs */}
          <div className="flex flex-col gap-3">
            <label className="text-xs text-slate-400 uppercase tracking-wide">
              {mode === "benchmark" ? "Main domain" : "Domain"}
            </label>
            <input
              type="text"
              placeholder="e.g. decathlon.be"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              className="w-full max-w-md px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />

            {mode === "benchmark" && (
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 uppercase tracking-wide">
                  Competitors
                </label>
                {competitors.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 max-w-md">
                    <input
                      type="text"
                      placeholder={`competitor${i + 1}.com`}
                      value={c}
                      onChange={(e) => {
                        const next = [...competitors];
                        next[i] = e.target.value;
                        setCompetitors(next);
                      }}
                      className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    {competitors.length > 1 && (
                      <button
                        onClick={() =>
                          setCompetitors(competitors.filter((_, j) => j !== i))
                        }
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {competitors.length < 4 && (
                  <button
                    onClick={() => setCompetitors([...competitors, ""])}
                    className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors w-fit"
                  >
                    <Plus className="w-4 h-4" />
                    Add competitor
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Location + Run */}
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wide mb-2">
                Country / Language
              </label>
              <select
                value={locationIdx}
                onChange={(e) => setLocationIdx(Number(e.target.value))}
                className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {LOCATIONS.map((l, i) => (
                  <option key={i} value={i}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={run}
              disabled={loading || !domain.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Fetching…
                </>
              ) : (
                "Run analysis"
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-950/40 border border-red-800 rounded-xl px-4 py-3 text-red-300">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <div className="flex flex-col gap-6">
            {/* Stats */}
            {rankedResult && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-200">
                    {rankedResult.domain}
                    <span className="ml-2 text-sm text-slate-500 font-normal">
                      {rankedResult.total.toLocaleString()} keywords
                    </span>
                  </h2>
                </div>
                <StatsCards keywords={rankedResult.keywords} />
              </>
            )}

            {benchmarkResult && (
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-200">
                  Benchmark
                  <span className="ml-2 text-sm text-slate-500 font-normal">
                    {benchmarkResult.domains.join(" vs ")} ·{" "}
                    {benchmarkResult.total.toLocaleString()} unique keywords
                  </span>
                </h2>
              </div>
            )}

            {/* Tabs */}
            {benchmarkResult && (
              <div className="flex gap-2 border-b border-slate-800 pb-0">
                {(
                  [
                    { key: "gap", label: "Keyword Gap" },
                  ] as { key: Tab; label: string }[]
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                      activeTab === key
                        ? "border-blue-500 text-blue-400"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Table views */}
            {rankedResult && (
              <KeywordsTable keywords={rankedResult.keywords} />
            )}
            {benchmarkResult && activeTab === "gap" && (
              <KeywordGap
                gap={benchmarkResult.gap}
                domains={benchmarkResult.domains}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
