"use client";

import { useMemo, useState } from "react";
import { GapKeyword } from "@/lib/types";
import { buildKeywordCategoryMap, getTopCategories } from "@/lib/semantics";

interface Props {
  gap: GapKeyword[];
  domains: string[];
  brandName?: string;
  exportMode?: boolean;
  aiCategoryMap?: Map<string, string> | null;
  categorizingAI?: boolean;
}

type BarMetric = "keywords" | "top10" | "traffic";
type Metric = BarMetric | "categories";
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
  categories: "Catégories",
};

const CAT_PALETTE = [
  "bg-violet-400", "bg-sky-400", "bg-amber-400", "bg-emerald-400",
  "bg-rose-400", "bg-orange-400", "bg-teal-400", "bg-pink-400",
];
const CAT_TEXT = [
  "text-violet-700", "text-sky-700", "text-amber-700", "text-emerald-700",
  "text-rose-700", "text-orange-700", "text-teal-700", "text-pink-700",
];

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
  metric: BarMetric;
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

function CategoryView({
  filteredGap,
  domains,
  categoryMap,
  topCategories,
  topN = 8,
}: {
  filteredGap: GapKeyword[];
  domains: string[];
  categoryMap: Map<string, string>;
  topCategories: string[];
  topN?: number;
}) {
  const catStats = topCategories.slice(0, topN).map((cat, idx) => {
    const catKws = filteredGap.filter((kw) => categoryMap.get(kw.keyword) === cat);
    const domainCounts = domains.map((d) => ({
      domain: d,
      count: catKws.filter((kw) => kw.positions[d] !== undefined).length,
    }));
    return { cat, domainCounts, total: catKws.length, idx };
  });

  const maxTotal = Math.max(...catStats.map((s) => s.total), 1);

  return (
    <div className="space-y-4">
      {catStats.map(({ cat, domainCounts, total, idx }) => (
        <div key={cat} className="flex items-start gap-3">
          <span className={`text-xs font-semibold w-24 shrink-0 pt-1 truncate ${CAT_TEXT[idx % CAT_TEXT.length]}`} title={cat}>
            {cat}
          </span>
          <div className="flex-1 space-y-1">
            {domainCounts.map((dc, di) => {
              const pct = (dc.count / maxTotal) * 100;
              const color = COLORS[di % COLORS.length];
              return (
                <div key={dc.domain} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-20 shrink-0 truncate text-right" title={dc.domain}>
                    {dc.domain.replace(/^www\./, "")}
                  </span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color.bar}`} style={{ width: `${Math.max(pct, dc.count > 0 ? 1 : 0)}%` }} />
                  </div>
                  <span className={`text-xs font-semibold w-8 text-right tabular-nums ${color.text}`}>{dc.count}</span>
                </div>
              );
            })}
          </div>
          <span className="text-xs text-gray-400 shrink-0 pt-1">{total} kw</span>
        </div>
      ))}
    </div>
  );
}

export default function DomainComparisonChart({ gap, domains, brandName = "", exportMode = false, aiCategoryMap, categorizingAI = false }: Props) {
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

  const localCategoryMap = useMemo(
    () => buildKeywordCategoryMap(gap.map((k) => k.keyword)),
    [gap]
  );
  const categoryMap = aiCategoryMap ?? localCategoryMap;
  const topCategories = useMemo(() => getTopCategories(categoryMap), [categoryMap]);

  const BAR_METRICS: BarMetric[] = ["keywords", "top10", "traffic"];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">Performance par domaine</h3>
            {categorizingAI && <span className="text-xs text-violet-500 font-medium animate-pulse">Catégorisation IA…</span>}
            {aiCategoryMap && !categorizingAI && <span className="text-xs text-violet-600 font-medium">✦ Catégories IA</span>}
          </div>
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
              {(["keywords", "top10", "traffic", "categories"] as Metric[]).map((m) => (
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

      {/* Normal mode */}
      {!exportMode && metric !== "categories" && (
        <BarGroup stats={stats} metric={metric as BarMetric} />
      )}
      {!exportMode && metric === "categories" && (
        <CategoryView
          filteredGap={filteredGap}
          domains={domains}
          categoryMap={categoryMap}
          topCategories={topCategories}
        />
      )}

      {/* Export mode: all views stacked */}
      {exportMode && (
        <div className="flex flex-col gap-8">
          {BAR_METRICS.map((m) => (
            <div key={m}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{LABELS[m]}</p>
              <BarGroup stats={stats} metric={m} />
            </div>
          ))}
          {topCategories.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{LABELS.categories}</p>
              <CategoryView
                filteredGap={filteredGap}
                domains={domains}
                categoryMap={categoryMap}
                topCategories={topCategories}
              />
            </div>
          )}
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
