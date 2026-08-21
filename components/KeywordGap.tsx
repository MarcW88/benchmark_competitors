"use client";

import { useState, useMemo } from "react";
import { Download, Search } from "lucide-react";
import { GapKeyword } from "@/lib/types";

interface Props {
  gap: GapKeyword[];
  domains: string[];
}

type GapFilter = "all" | "gap" | "shared";

const PAGE_SIZE = 50;

export default function KeywordGap({ gap, domains }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<GapFilter>("all");
  const [minVolume, setMinVolume] = useState(0);
  const [page, setPage] = useState(1);

  const mainDomain = domains[0];
  const competitors = domains.slice(1);

  const filtered = useMemo(() => {
    return gap.filter((kw) => {
      if (search && !kw.keyword.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (kw.search_volume < minVolume) return false;
      const mainPos = kw.positions[mainDomain];
      const compHas = competitors.some((d) => kw.positions[d] !== undefined);
      if (filter === "gap") return !mainPos && compHas;
      if (filter === "shared") return !!mainPos && compHas;
      return true;
    });
  }, [gap, search, filter, minVolume, mainDomain, competitors]);

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
    if (!pos)
      return (
        <span className="text-slate-600 text-xs">—</span>
      );
    return (
      <span
        className={`font-bold ${
          pos <= 3
            ? "text-emerald-400"
            : pos <= 10
            ? "text-blue-400"
            : pos <= 20
            ? "text-violet-400"
            : "text-slate-400"
        }`}
      >
        {pos}
      </span>
    );
  }

  const gapCount = gap.filter(
    (k) => !k.positions[mainDomain] && competitors.some((d) => k.positions[d])
  ).length;
  const sharedCount = gap.filter(
    (k) => k.positions[mainDomain] && competitors.some((d) => k.positions[d])
  ).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Total unique</div>
          <div className="text-2xl font-bold text-slate-200">{gap.length.toLocaleString()}</div>
        </div>
        <div className="bg-slate-800 border border-red-900/30 rounded-xl p-4">
          <div className="text-xs text-red-400 uppercase tracking-wide mb-1">Keyword gap</div>
          <div className="text-2xl font-bold text-red-400">{gapCount.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-0.5">competitors rank, you don&apos;t</div>
        </div>
        <div className="bg-slate-800 border border-emerald-900/30 rounded-xl p-4">
          <div className="text-xs text-emerald-400 uppercase tracking-wide mb-1">Shared</div>
          <div className="text-2xl font-bold text-emerald-400">{sharedCount.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-0.5">all domains rank</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter keyword…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-56"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
          {(["all", "gap", "shared"] as GapFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>Vol ≥</span>
          <input
            type="number"
            value={minVolume}
            onChange={(e) => { setMinVolume(Number(e.target.value)); setPage(1); }}
            className="w-24 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 text-sm text-slate-400">
          <span>{filtered.length.toLocaleString()} keywords</span>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-sm text-slate-300">
          <thead>
            <tr className="bg-slate-800 text-xs text-slate-400 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Keyword</th>
              <th className="px-4 py-3 text-right">Volume</th>
              <th className="px-4 py-3 text-right">CPC</th>
              <th className="px-4 py-3 text-right">KD</th>
              {domains.map((d, i) => (
                <th key={d} className="px-4 py-3 text-center">
                  <span
                    className={
                      i === 0 ? "text-blue-400 font-semibold" : "text-slate-400"
                    }
                  >
                    {d}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((kw, i) => (
              <tr
                key={`${kw.keyword}-${i}`}
                className={`border-t border-slate-700/50 hover:bg-slate-800/50 transition-colors ${
                  !kw.positions[mainDomain] ? "bg-red-950/10" : ""
                }`}
              >
                <td className="px-4 py-2.5 font-medium text-slate-200 max-w-xs truncate">
                  {kw.keyword}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {kw.search_volume.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-400">
                  ${kw.cpc.toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {kw.keyword_difficulty}
                </td>
                {domains.map((d) => (
                  <td key={d} className="px-4 py-2.5 text-center">
                    {posCell(kw.positions[d])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>
            Page {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors"
            >
              ← Prev
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
