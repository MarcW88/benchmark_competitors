"use client";

import { RankedKeyword } from "@/lib/dataforseo";

interface Props {
  keywords: RankedKeyword[];
}

export default function StatsCards({ keywords }: Props) {
  const top3 = keywords.filter((k) => k.position <= 3).length;
  const top10 = keywords.filter((k) => k.position <= 10).length;
  const top20 = keywords.filter((k) => k.position <= 20).length;
  const top100 = keywords.length;
  const totalTraffic = Math.round(
    keywords.reduce((s, k) => s + k.estimated_traffic, 0)
  );

  const cards = [
    { label: "Top 3", value: top3, color: "text-emerald-400" },
    { label: "Top 10", value: top10, color: "text-blue-400" },
    { label: "Top 20", value: top20, color: "text-violet-400" },
    { label: "Top 100", value: top100, color: "text-slate-300" },
    { label: "Est. Traffic", value: totalTraffic.toLocaleString(), color: "text-amber-400" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-1"
        >
          <span className="text-xs text-slate-400 uppercase tracking-wide">
            {c.label}
          </span>
          <span className={`text-2xl font-bold ${c.color}`}>{c.value}</span>
        </div>
      ))}
    </div>
  );
}
