"use client";

import { useMemo, useState } from "react";
import { GapKeyword } from "@/lib/types";

interface Props {
  gap: GapKeyword[];
  domains: string[];
  brandName?: string;
  exportMode?: boolean;
}

type Metric = "keywords" | "top10" | "traffic";
type BrandFilter = "all" | "brand" | "non-brand";

const CTR = [0.316, 0.143, 0.089, 0.067, 0.054, 0.045, 0.038, 0.033, 0.029, 0.026];
function estimateCtr(pos: number) {
  if (pos <= 0) return 0;
  return CTR[Math.min(pos - 1, CTR.length - 1)] ?? 0.008;
}

function formatValue(v: number, metric: Metric) {
  if (metric === "traffic") {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
    return v.toLocaleString();
  }
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return v.toLocaleString();
}

const LABELS: Record<Metric, string> = {
  keywords: "Total keywords",
  top10: "Top 10",
  traffic: "Trafic estimé",
};

const COLORS = [
  { bar: "bg-blue-500", text: "text-blue-600", light: "bg-blue-50 border-blue-200" },
  { bar: "bg-rose-400", text: "text-rose-600", light: "bg-rose-50 border-rose-200" },
  { bar: "bg-amber-400", text: "text-amber-600", light: "bg-amber-50 border-amber-200" },
  { bar: "bg-emerald-400", text: "text-emerald-600", light: "bg-emerald-50 border-emerald-200" },
  { bar: "bg-purple-400", text: "text-purple-600", light: "bg-purple-50 border-purple-200" },
];

function BarGroup({
  stats,
  metric,
}: {
  stats: { domain: string; keywords: number; top10: number; traffic: number }[];
  metric: Metric;
}) {
  const values = stats.map((s) => s[metric]);
  const max = Math.max(...values) || 1;
  return (
    <div className="flex items-end gap-4 h-44">
      {stats.map((s, i) => {
        const val = s[metric];
        const pct = (val / max) * 100;
        const color = COLORS[i % COLORS.length];
        return (
          <div key={s.domain} className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <span className={`text-xs font-bold tabular-nums ${color.text}`}>
              {formatValue(val, metric)}
            </span>
            <div className="w-full flex items-end" style={{ height: "120px" }}>
              <div
                className={`w-full rounded-t-lg ${color.bar}`}
                style={{ height: `${Math.max(pct, 1)}%` }}
              />
            </div>
            <div
              className={`w-full text-center px-1 py-1 rounded-lg border text-xs font-medium truncate ${color.light}`}
              title={s.domain}
            >
              {s.domain.replace(/^www\./, "")}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DomainComparisonChart({ gap, domains, brandName = "", exportMode = false }: Props) {
  const [metric, setMetric] = useState<Metric>("keywords");
  const [brandFilter, setBrandFilter] = useState<BrandFilter>("all");

  const brands = brandName.split(",").map((b) => b.trim().toLowerCase()).filter(Boolean);
  const isBranded = (kw: string) => brands.some((b) => kw.toLowerCase().includes(b));

  const filteredGap = useMemo(() => {
    if (brandFilter === "all" || !brands.length) return gap;
    return gap.filter((kw) =>
      brandFilter === "brand" ? isBranded(kw.keyword) : !isBranded(kw.keyword)
    );
  }, [gap, brandFilter, brandName]);

  const stats = useMemo(() => {
    return domains.map((d) => {
      let keywords = 0;
      let top10 = 0;
      let traffic = 0;
      filteredGap.forEach((kw) => {
        const pos = kw.positions[d];
        if (!pos) return;
        keywords++;
        if (pos <= 10) top10++;
        traffic += Math.round(kw.search_volume * estimateCtr(pos));
      });
      return { domain: d, keywords, top10, traffic };
    });
  }, [filteredGap, domains]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Performance par domaine</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {domains[0]} vs {domains.slice(1).join(", ")}
          </p>
        </div>
        {!exportMode && (
          <div className="flex flex-wrap items-center gap-2">
            {brands.length > 0 && (
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {(["all", "brand", "non-brand"] as BrandFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setBrandFilter(f)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      brandFilter === f
                        ? "bg-white text-blue-600 shadow-sm font-semibold"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {f === "all" ? "All" : f === "brand" ? "🏷 Brand" : "Non-brand"}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(["keywords", "top10", "traffic"] as Metric[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    metric === m
                      ? "bg-white text-blue-600 shadow-sm font-semibold"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {LABELS[m]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Normal mode: single chart */}
      {!exportMode && <BarGroup stats={stats} metric={metric} />}

      {/* Export mode: all 3 charts stacked */}
      {exportMode && (
        <div className="flex flex-col gap-8">
          {(["keywords", "top10", "traffic"] as Metric[]).map((m) => (
            <div key={m}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {LABELS[m]}
              </p>
              <BarGroup stats={stats} metric={m} />
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total keywords", value: filteredGap.length.toLocaleString() },
          {
            label: "Exclusifs main",
            value: filteredGap
              .filter((k) => !!k.positions[domains[0]] && domains.slice(1).every((d) => !k.positions[d]))
              .length.toLocaleString(),
          },
          {
            label: "Gap (concurrents seuls)",
            value: filteredGap
              .filter((k) => !k.positions[domains[0]] && domains.slice(1).some((d) => !!k.positions[d]))
              .length.toLocaleString(),
          },
          {
            label: "Keywords partagés",
            value: filteredGap
              .filter((k) => !!k.positions[domains[0]] && domains.slice(1).some((d) => !!k.positions[d]))
              .length.toLocaleString(),
          },
        ].map((card) => (
          <div key={card.label} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">{card.label}</p>
            <p className="text-lg font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
