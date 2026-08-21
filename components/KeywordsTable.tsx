"use client";

import { useState, useMemo } from "react";
import { RankedKeyword } from "@/lib/dataforseo";
import { Download, Search, SlidersHorizontal } from "lucide-react";

interface Props {
  keywords: RankedKeyword[];
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

export default function KeywordsTable({ keywords }: Props) {
  const [search, setSearch] = useState("");
  const [posRange, setPosRange] = useState(0);
  const [minVolume, setMinVolume] = useState(0);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof RankedKeyword>("position");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    const range = POSITION_RANGES[posRange];
    return keywords
      .filter(
        (k) =>
          k.position >= range.min &&
          k.position <= range.max &&
          k.search_volume >= minVolume &&
          (search === "" ||
            k.keyword.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => {
        const av = a[sortKey] as number | string;
        const bv = b[sortKey] as number | string;
        if (typeof av === "number" && typeof bv === "number") {
          return sortAsc ? av - bv : bv - av;
        }
        return sortAsc
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
  }, [keywords, search, posRange, minVolume, sortKey, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key: keyof RankedKeyword) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(key === "position");
    }
    setPage(1);
  }

  function exportCSV() {
    const headers = [
      "Keyword",
      "Position",
      "URL",
      "Volume",
      "Est. Traffic",
      "CPC",
      "KD",
    ];
    const rows = filtered.map((k) =>
      [
        `"${k.keyword}"`,
        k.position,
        `"${k.url}"`,
        k.search_volume,
        Math.round(k.estimated_traffic),
        k.cpc.toFixed(2),
        k.keyword_difficulty,
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "keywords.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const SortIcon = ({ col }: { col: keyof RankedKeyword }) => (
    <span className="ml-1 text-xs opacity-40">
      {sortKey === col ? (sortAsc ? "↑" : "↓") : "↕"}
    </span>
  );

  return (
    <div className="flex flex-col gap-4">
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
          {POSITION_RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => { setPosRange(i); setPage(1); }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                posRange === i
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-400">
          <SlidersHorizontal className="w-4 h-4" />
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
              {(
                [
                  ["keyword", "Keyword"],
                  ["position", "Pos."],
                  ["url", "URL"],
                  ["search_volume", "Volume"],
                  ["estimated_traffic", "Traffic"],
                  ["cpc", "CPC"],
                  ["keyword_difficulty", "KD"],
                ] as [keyof RankedKeyword, string][]
              ).map(([key, label]) => (
                <th
                  key={key}
                  className="px-4 py-3 text-left cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                  onClick={() => handleSort(key)}
                >
                  {label}
                  <SortIcon col={key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((kw, i) => (
              <tr
                key={`${kw.keyword}-${i}`}
                className="border-t border-slate-700/50 hover:bg-slate-800/50 transition-colors"
              >
                <td className="px-4 py-2.5 font-medium text-slate-200 max-w-xs truncate">
                  {kw.keyword}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`font-bold ${
                      kw.position <= 3
                        ? "text-emerald-400"
                        : kw.position <= 10
                        ? "text-blue-400"
                        : kw.position <= 20
                        ? "text-violet-400"
                        : "text-slate-400"
                    }`}
                  >
                    {kw.position}
                  </span>
                </td>
                <td className="px-4 py-2.5 max-w-xs">
                  <span className="text-xs text-slate-400 truncate block max-w-[200px]">
                    {kw.url}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {kw.search_volume.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {Math.round(kw.estimated_traffic).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-400">
                  ${kw.cpc.toFixed(2)}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-red-500 rounded-full"
                        style={{ width: `${kw.keyword_difficulty}%` }}
                      />
                    </div>
                    <span className="text-xs w-6 text-right">
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
