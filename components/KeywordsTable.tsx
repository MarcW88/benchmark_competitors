"use client";

import { useState, useMemo } from "react";
import { RankedKeyword } from "@/lib/dataforseo";
import { Download, Search, SlidersHorizontal, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

type BrandFilter = "all" | "brand" | "non-brand";

interface Props {
  keywords: RankedKeyword[];
  brandName?: string;
}

const POSITION_RANGES = [
  { label: "All", min: 1, max: 100 },
  { label: "Top 3", min: 1, max: 3 },
  { label: "4–10", min: 4, max: 10 },
  { label: "11–20", min: 11, max: 20 },
  { label: "21–50", min: 21, max: 50 },
  { label: "51–100", min: 51, max: 100 },
];

const PAGE_SIZE = 50;

function posBadge(pos: number) {
  if (pos <= 3) return "bg-green-100 text-green-700 font-bold";
  if (pos <= 10) return "bg-blue-100 text-blue-700 font-semibold";
  if (pos <= 20) return "bg-purple-100 text-purple-700";
  return "bg-gray-100 text-gray-500";
}

export default function KeywordsTable({ keywords, brandName = "" }: Props) {
  const [search, setSearch] = useState("");
  const [posRange, setPosRange] = useState(0);
  const [minVolume, setMinVolume] = useState(0);
  const [brandFilter, setBrandFilter] = useState<BrandFilter>("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof RankedKeyword>("position");
  const [sortAsc, setSortAsc] = useState(true);

  const isBranded = (kw: string) =>
    brandName ? kw.toLowerCase().includes(brandName.toLowerCase()) : false;

  const filtered = useMemo(() => {
    const range = POSITION_RANGES[posRange];
    return keywords
      .filter(
        (k) =>
          k.position >= range.min &&
          k.position <= range.max &&
          k.search_volume >= minVolume &&
          (search === "" || k.keyword.toLowerCase().includes(search.toLowerCase())) &&
          (brandFilter === "all" || !brandName ||
            (brandFilter === "brand" ? isBranded(k.keyword) : !isBranded(k.keyword)))
      )
      .sort((a, b) => {
        const av = a[sortKey] as number | string;
        const bv = b[sortKey] as number | string;
        if (typeof av === "number" && typeof bv === "number")
          return sortAsc ? av - bv : bv - av;
        return sortAsc
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
  }, [keywords, search, posRange, minVolume, sortKey, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key: keyof RankedKeyword) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === "position"); }
    setPage(1);
  }

  function exportCSV() {
    const headers = ["Keyword", "Position", "URL", "Volume", "Est. Traffic", "CPC", "KD"];
    const rows = filtered.map((k) =>
      [`"${k.keyword}"`, k.position, `"${k.url}"`, k.search_volume,
        Math.round(k.estimated_traffic), k.cpc.toFixed(2), k.keyword_difficulty].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "keywords.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const SortIcon = ({ col }: { col: keyof RankedKeyword }) => {
    if (sortKey !== col) return <ChevronsUpDown className="inline w-3 h-3 ml-1 text-gray-300" />;
    return sortAsc
      ? <ChevronUp className="inline w-3 h-3 ml-1 text-blue-500" />
      : <ChevronDown className="inline w-3 h-3 ml-1 text-blue-500" />;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search keyword…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-56 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {POSITION_RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => { setPosRange(i); setPage(1); }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                posRange === i ? "bg-white text-blue-600 shadow-sm font-semibold" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <SlidersHorizontal className="w-4 h-4" />
          <span>Vol ≥</span>
          <input
            type="number"
            value={minVolume}
            onChange={(e) => { setMinVolume(Number(e.target.value)); setPage(1); }}
            className="w-24 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>

        {brandName && (
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(["all", "brand", "non-brand"] as BrandFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => { setBrandFilter(f); setPage(1); }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  brandFilter === f ? "bg-white text-blue-600 shadow-sm font-semibold" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f === "all" ? "All" : f === "brand" ? "🏷 Brand" : "Non-brand"}
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
            <tr className="bg-gray-50 border-b border-gray-200">
              {(
                [
                  ["keyword", "Keyword"],
                  ["position", "Position"],
                  ["url", "URL"],
                  ["search_volume", "Volume"],
                  ["estimated_traffic", "Traffic"],
                  ["cpc", "CPC"],
                  ["keyword_difficulty", "Difficulty"],
                ] as [keyof RankedKeyword, string][]
              ).map(([key, label]) => (
                <th
                  key={key}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none whitespace-nowrap"
                  onClick={() => handleSort(key)}
                >
                  {label}<SortIcon col={key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paged.map((kw, i) => (
              <tr key={`${kw.keyword}-${i}`} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                  {kw.keyword}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs ${posBadge(kw.position)}`}>
                    #{kw.position}
                  </span>
                </td>
                <td className="px-4 py-3 max-w-[200px]">
                  <span className="text-xs text-gray-400 truncate block">{kw.url}</span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-700 font-medium">
                  {kw.search_volume.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                  {Math.round(kw.estimated_traffic).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                  ${kw.cpc.toFixed(2)}
                </td>
                <td className="px-4 py-3 w-32">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${kw.keyword_difficulty}%`,
                          background: `hsl(${120 - kw.keyword_difficulty * 1.2}, 70%, 50%)`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-6 text-right tabular-nums">
                      {kw.keyword_difficulty}
                    </span>
                  </div>
                </td>
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
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors text-xs font-medium shadow-sm"
            >
              ← Previous
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors text-xs font-medium shadow-sm"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
