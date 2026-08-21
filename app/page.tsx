"use client";

import { useState } from "react";
import { Plus, X, BarChart3, GitCompareArrows, Loader2, AlertCircle, Presentation, FileDown } from "lucide-react";
import StatsCards from "@/components/StatsCards";
import KeywordsTable from "@/components/KeywordsTable";
import KeywordGap from "@/components/KeywordGap";
import SlideView from "@/components/SlideView";
import DomainComparisonChart from "@/components/DomainComparisonChart";
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
  const [slideOpen, setSlideOpen] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [brandName, setBrandName] = useState("");

  const loc = LOCATIONS[locationIdx];

  function deriveBrand(d: string) {
    return d.split(".")[0].replace(/[-_]/g, " ").trim();
  }

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

  async function exportPagePDF() {
    setPdfExporting(true);
    setExportMode(true);
    await new Promise((r) => setTimeout(r, 300));
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");
      const el = document.getElementById("results-section");
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, backgroundColor: "#ffffff", scrollY: 0 });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pdfW) / canvas.width;
      let y = 0;
      while (y < imgH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(img, "PNG", 0, -y, pdfW, imgH);
        y += pdfH;
      }
      pdf.save(`benchmark-${domain || "report"}.pdf`);
    } finally {
      setExportMode(false);
      setPdfExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 no-print sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <span className="font-bold text-gray-900 text-base tracking-tight">Benchmark</span>
          <span className="text-xs text-gray-400 font-normal">by DataForSEO</span>
        </div>
        {hasResults && (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={exportPagePDF}
              disabled={pdfExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-600 text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              <FileDown className="w-3.5 h-3.5" />
              {pdfExporting ? "Exporting…" : "Export PDF"}
            </button>
            <button
              onClick={() => setSlideOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
            >
              <Presentation className="w-3.5 h-3.5" />
              Presentation
            </button>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Config panel */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6 no-print">
          {/* Mode */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Analysis type
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "ranked", label: "Ranking Keywords", desc: "What the domain ranks for now" },
                  { key: "relevant", label: "Relevant Keywords", desc: "Full relevant keyword space" },
                  { key: "benchmark", label: "Multi-domain Benchmark", desc: "Keyword gap across domains" },
                ] as { key: Mode; label: string; desc: string }[]
              ).map(({ key, label, desc }) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    mode === key
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  {key === "benchmark" && <GitCompareArrows className="w-4 h-4" />}
                  {label}
                  {mode === key && <span className="text-xs opacity-75 font-normal hidden sm:inline">— {desc}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Domain inputs */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {mode === "benchmark" ? "Main domain" : "Domain"}
            </label>
            <input
              type="text"
              placeholder="e.g. decathlon.be"
              value={domain}
              onChange={(e) => { setDomain(e.target.value); if (!brandName) setBrandName(deriveBrand(e.target.value)); }}
              onKeyDown={(e) => e.key === "Enter" && run()}
              className="w-full max-w-sm px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-sm"
            />

            {mode === "benchmark" && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Competitors
                </label>
                {competitors.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 max-w-sm">
                    <input
                      type="text"
                      placeholder={`competitor${i + 1}.com`}
                      value={c}
                      onChange={(e) => {
                        const next = [...competitors];
                        next[i] = e.target.value;
                        setCompetitors(next);
                      }}
                      className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
                    />
                    {competitors.length > 1 && (
                      <button
                        onClick={() => setCompetitors(competitors.filter((_, j) => j !== i))}
                        className="p-2 text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {competitors.length < 4 && (
                  <button
                    onClick={() => setCompetitors([...competitors, ""])}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors w-fit font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add competitor
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Brand name */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Brand name(s) <span className="font-normal normal-case text-gray-300">(séparés par virgule : decathlon, athlete)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. decathlon, sport 2000"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full max-w-xs px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
            />
          </div>

          {/* Location + Run */}
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Country / Language
              </label>
              <select
                value={locationIdx}
                onChange={(e) => setLocationIdx(Number(e.target.value))}
                className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
              >
                {LOCATIONS.map((l, i) => (
                  <option key={i} value={i}>{l.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={run}
              disabled={loading || !domain.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors shadow-sm text-sm"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Fetching…</>
              ) : "Run analysis"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <div id="results-section" className="flex flex-col gap-6">
            {rankedResult && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{rankedResult.domain}</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {rankedResult.total.toLocaleString()} organic keywords · {LOCATIONS[locationIdx].label}
                    </p>
                  </div>
                </div>
                <StatsCards keywords={rankedResult.keywords} />
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <KeywordsTable keywords={rankedResult.keywords} brandName={brandName} exportMode={exportMode} />
                </div>
              </>
            )}

            {benchmarkResult && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Keyword Gap Analysis</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {benchmarkResult.domains.join(" vs ")} · {benchmarkResult.total.toLocaleString()} unique keywords · {LOCATIONS[locationIdx].label}
                    </p>
                  </div>
                </div>
                <DomainComparisonChart gap={benchmarkResult.gap} domains={benchmarkResult.domains} />
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <KeywordGap gap={benchmarkResult.gap} domains={benchmarkResult.domains} brandName={brandName} exportMode={exportMode} />
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Slide View */}
      {slideOpen && (
        <SlideView
          domain={rankedResult?.domain ?? benchmarkResult?.domains[0] ?? domain}
          keywords={rankedResult?.keywords}
          gap={benchmarkResult?.gap}
          gapDomains={benchmarkResult?.domains}
          onClose={() => setSlideOpen(false)}
        />
      )}
    </div>
  );
}
