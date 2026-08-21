"use client";

import { useState, useMemo } from "react";
import { Download, Search, TrendingUp } from "lucide-react";
import { GapKeyword } from "@/lib/types";

interface Props {
  gap: GapKeyword[];
  domains: string[];
  brandName?: string;
}

type GapFilter = "all" | "gap" | "shared";
type BrandFilter = "all" | "brand" | "non-brand";

const PAGE_SIZE = 50;

export default function KeywordGap({ gap, domains, brandName = "" }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<GapFilter>("all");
  const [brandFilter, setBrandFilter] = useState<BrandFilter>("all");
  const [minVolume, setMinVolume] = useState(0);
  const [page, setPage] = useState(1);

  const brands = brandName
    .split(",")
    .map((b) => b.trim().toLowerCase())
    .filter(Boolean);

  const isBranded = (kw: string) => {
    if (!brands.length) return false;
    const kwLower = kw.toLowerCase();
    return brands.some((b) => kwLower.includes(b));
  };

  const mainDomain = domains[0];
  const competitors = domains.slice(1);

  const filtered = useMemo(() => {
    return gap.filter((kw) => {
      if (search && !kw.keyword.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (kw.search_volume < minVolume) return false;
      const mainPos = kw.positions[mainDomain];
      const compHas = competitors.some((d) => kw.positions[d] !== undefined);
      if (filter === "gap") { if (!(!mainPos && compHas)) return false; }
      else if (filter === "shared") { if (!(!!mainPos && compHas)) return false; }
      if (brandFilter !== "all" && brands.length) {
        const branded = isBranded(kw.keyword);
        if (brandFilter === "brand" && !branded) return false;
        if (brandFilter === "non-brand" && branded) return false;
      }
      return true;
    });
  }, [gap, search, filter, brandFilter, minVolume, mainDomain, competitors, brandName]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function exportCSV() {
    const headers = [
      "Keyword",
      "Volume",
      "CPC",
      "KD",
      ...domains,
    ];
    const rows = filtered.map((kw) => [
      `"${kw.keyword}"`,
      kw.search_volume,
      kw.cpc.toFixed(2),
      kw.keyword_difficulty,
      ...domains.map((d) => kw.positions[d] ?? "—"),
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "keyword-gap.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function posCell(pos: number | undefined) {
    if (!pos) return <span className="text-gray-300 text-xs">—</span>;
    const cls =
      pos <= 3 ? "bg-green-100 text-green-700 font-bold" :
      pos <= 10 ? "bg-blue-100 text-blue-700 font-semibold" :
      pos <= 20 ? "bg-purple-100 text-purple-700" :
      "bg-gray-100 text-gray-500";
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${cls}`}>#{pos}</span>;
  }

  const gapCount = gap.filter(
    (k) => !k.positions[mainDomain] && competitors.some((d) => k.positions[d])
  ).length;
  const sharedCount = gap.filter(
    (k) => k.positions[mainDomain] && competitors.some((d) => k.positions[d])
  ).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Total unique keywords</div>
          <div className="text-3xl font-bold text-gray-900">{gap.length.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-red-500" />
            <div className="text-xs font-semibold text-red-500 uppercase tracking-wide">Keyword gap</div>
          </div>
          <div className="text-3xl font-bold text-red-600">{gapCount.toLocaleString()}</div>
          <div className="text-xs text-red-400 mt-0.5">Competitors rank — you don&apos;t</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
          <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Shared keywords</div>
          <div className="text-3xl font-bold text-green-700">{sharedCount.toLocaleString()}</div>
          <div className="text-xs text-green-500 mt-0.5">All domains rank</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search keyword…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(["all", "gap", "shared"] as GapFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                filter === f ? "bg-white text-blue-600 shadow-sm font-semibold" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f === "gap" ? "Gap only" : f === "shared" ? "Shared" : "All"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Vol ≥</span>
          <input
            type="number"
            value={minVolume}
            onChange={(e) => { setMinVolume(Number(e.target.value)); setPage(1); }}
            className="w-24 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>

        {brands.length > 0 && (
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(["all", "brand", "non-brand"] as BrandFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => { setBrandFilter(f); setPage(1); }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  brandFilter === f ? "bg-white text-blue-600 shadow-sm font-semibold" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f === "all" ? "All" : f === "brand" ? `🏷 Brand${brands.length > 1 ? ` (${brands.length})` : ""}` : "Non-brand"}
              </button>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-3 text-sm text-gray-500">
          <span className="font-medium">{filtered.length.toLocaleString()} keywords</span>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-600 text-xs font-medium transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Keyword</th>
              <th className="px-4 py-3 text-right">Volume</th>
              <th className="px-4 py-3 text-right">CPC</th>
              <th className="px-4 py-3 text-right">KD</th>
              {domains.map((d, i) => (
                <th key={d} className="px-4 py-3 text-center">
                  <span className={i === 0 ? "text-blue-600" : "text-gray-400"}>{d}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paged.map((kw, i) => (
              <tr
                key={`${kw.keyword}-${i}`}
                className={`hover:bg-gray-50 transition-colors ${!kw.positions[mainDomain] ? "bg-red-50/40" : ""}`}
              >
                <td className="px-4 py-2.5 font-medium text-gray-900 max-w-xs truncate">{kw.keyword}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-gray-700 font-medium">
                  {kw.search_volume.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">${kw.cpc.toFixed(2)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">{kw.keyword_difficulty}</td>
                {domains.map((d) => (
                  <td key={d} className="px-4 py-2.5 text-center">{posCell(kw.positions[d])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page} of {totalPages} · {filtered.length.toLocaleString()} results</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 text-xs font-medium shadow-sm">
              ← Previous
            </button>
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 text-xs font-medium shadow-sm">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
