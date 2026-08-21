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
    { label: "Top 3", value: top3, accent: "#10B981", bg: "#F0FDF4", border: "#BBF7D0" },
    { label: "Top 10", value: top10, accent: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
    { label: "Top 20", value: top20, accent: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
    { label: "Top 100", value: top100, accent: "#64748B", bg: "#F8FAFC", border: "#E2E8F0" },
    { label: "Est. Traffic", value: totalTraffic.toLocaleString(), accent: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl p-4 flex flex-col gap-1"
          style={{ background: c.bg, border: `1px solid ${c.border}` }}
        >
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: c.accent }}>
            {c.label}
          </span>
          <span className="text-3xl font-bold text-gray-900">{c.value}</span>
        </div>
      ))}
    </div>
  );
}
