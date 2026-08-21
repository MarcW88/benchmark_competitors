"use client";

import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, FileDown, X } from "lucide-react";
import { RankedKeyword } from "@/lib/dataforseo";
import { GapKeyword } from "@/lib/types";

interface Props {
  domain: string;
  keywords?: RankedKeyword[];
  gap?: GapKeyword[];
  gapDomains?: string[];
  onClose: () => void;
}

function posBadge(pos: number) {
  if (pos <= 3) return "bg-green-100 text-green-700";
  if (pos <= 10) return "bg-blue-100 text-blue-700";
  if (pos <= 20) return "bg-purple-100 text-purple-700";
  return "bg-gray-100 text-gray-500";
}

export default function SlideView({ domain, keywords = [], gap = [], gapDomains = [], onClose }: Props) {
  const [slide, setSlide] = useState(0);
  const [exporting, setExporting] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);

  const top3 = keywords.filter((k) => k.position <= 3).length;
  const top10 = keywords.filter((k) => k.position <= 10).length;
  const top20 = keywords.filter((k) => k.position <= 20).length;
  const top100 = keywords.length;
  const totalTraffic = Math.round(keywords.reduce((s, k) => s + k.estimated_traffic, 0));
  const top20kws = [...keywords].sort((a, b) => a.position - b.position).slice(0, 20);
  const mainDomain = gapDomains[0] ?? domain;
  const gapOnly = gap
    .filter((k) => !k.positions[mainDomain] && gapDomains.slice(1).some((d) => k.positions[d]))
    .sort((a, b) => b.search_volume - a.search_volume)
    .slice(0, 15);

  const slides = [
    { id: "overview", label: "Overview" },
    ...(keywords.length > 0 ? [{ id: "top-keywords", label: "Top Keywords" }] : []),
    ...(keywords.length > 0 ? [{ id: "distribution", label: "Distribution" }] : []),
    ...(gap.length > 0 ? [{ id: "gap", label: "Keyword Gap" }] : []),
    ...(gapOnly.length > 0 ? [{ id: "opportunities", label: "Opportunities" }] : []),
  ];

  const total = slides.length;

  async function exportPDF() {
    if (!slideRef.current) return;
    setExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1280, 720] });

      for (let i = 0; i < total; i++) {
        setSlide(i);
        await new Promise((r) => setTimeout(r, 300));
        const canvas = await html2canvas(slideRef.current!, {
          scale: 2, useCORS: true, backgroundColor: "#ffffff",
        });
        const img = canvas.toDataURL("image/png");
        if (i > 0) pdf.addPage();
        pdf.addImage(img, "PNG", 0, 0, 1280, 720);
      }
      pdf.save(`benchmark-${domain}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  const current = slides[slide];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-center p-4">
      {/* Controls */}
      <div className="flex items-center justify-between w-full max-w-5xl mb-3 no-print">
        <div className="flex items-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setSlide(i)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                i === slide ? "bg-white text-gray-900" : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            <FileDown className="w-3.5 h-3.5" />
            {exporting ? "Exporting…" : "Export PDF"}
          </button>
          <button onClick={onClose} className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slide */}
      <div
        ref={slideRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden"
        style={{ aspectRatio: "16/9" }}
      >
        {/* Slide header bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 to-blue-400" />

        <div className="p-10 h-full flex flex-col justify-between">
          {/* Watermark */}
          <div className="absolute top-6 right-8 text-xs text-gray-300 font-medium tracking-wide">
            Competitor Benchmark
          </div>

          {/* OVERVIEW */}
          {current.id === "overview" && (
            <>
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">SEO Benchmark</p>
                <h1 className="text-4xl font-bold text-gray-900">{domain}</h1>
                <p className="text-gray-400 mt-1 text-sm">Organic keyword performance overview</p>
              </div>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: "Top 3", value: top3, color: "#10B981" },
                  { label: "Top 10", value: top10, color: "#2563EB" },
                  { label: "Top 20", value: top20, color: "#7C3AED" },
                  { label: "Top 100", value: top100, color: "#64748B" },
                  { label: "Est. Traffic", value: totalTraffic.toLocaleString(), color: "#F59E0B" },
                ].map((c) => (
                  <div key={c.label} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: c.color }}>
                      {c.label}
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{c.value}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TOP KEYWORDS */}
          {current.id === "top-keywords" && (
            <>
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">Top Keywords</p>
                <h2 className="text-2xl font-bold text-gray-900">{domain} — Top 20 organic rankings</h2>
              </div>
              <table className="w-full text-xs mt-3">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="text-left py-1.5 font-semibold">Keyword</th>
                    <th className="text-center font-semibold w-16">Pos.</th>
                    <th className="text-right font-semibold w-20">Volume</th>
                    <th className="text-right font-semibold w-16">CPC</th>
                  </tr>
                </thead>
                <tbody>
                  {top20kws.map((kw, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-1 font-medium text-gray-800 truncate max-w-xs">{kw.keyword}</td>
                      <td className="py-1 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${posBadge(kw.position)}`}>
                          #{kw.position}
                        </span>
                      </td>
                      <td className="py-1 text-right tabular-nums text-gray-600">
                        {kw.search_volume.toLocaleString()}
                      </td>
                      <td className="py-1 text-right tabular-nums text-gray-400">${kw.cpc.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* DISTRIBUTION */}
          {current.id === "distribution" && (
            <>
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">Ranking Distribution</p>
                <h2 className="text-2xl font-bold text-gray-900">{domain}</h2>
              </div>
              <div className="grid grid-cols-2 gap-6 mt-4">
                <div className="flex flex-col gap-3">
                  {[
                    { label: "Top 3", count: top3, color: "#10B981", pct: (top3 / top100) * 100 },
                    { label: "Position 4–10", count: top10 - top3, color: "#2563EB", pct: ((top10 - top3) / top100) * 100 },
                    { label: "Position 11–20", count: top20 - top10, color: "#7C3AED", pct: ((top20 - top10) / top100) * 100 },
                    { label: "Position 21–100", count: top100 - top20, color: "#94A3B8", pct: ((top100 - top20) / top100) * 100 },
                  ].map((r) => (
                    <div key={r.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-600">{r.label}</span>
                        <span className="font-bold" style={{ color: r.color }}>{r.count.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col justify-center gap-2 pl-6 border-l border-gray-100">
                  <div className="text-4xl font-bold text-gray-900">{top100.toLocaleString()}</div>
                  <div className="text-sm text-gray-400">total ranked keywords</div>
                  <div className="mt-3 text-2xl font-bold text-amber-500">{totalTraffic.toLocaleString()}</div>
                  <div className="text-sm text-gray-400">estimated monthly traffic</div>
                </div>
              </div>
            </>
          )}

          {/* KEYWORD GAP */}
          {current.id === "gap" && (
            <>
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">Keyword Gap Analysis</p>
                <h2 className="text-2xl font-bold text-gray-900">{gapDomains.join(" vs ")}</h2>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-5">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Total unique</div>
                  <div className="text-4xl font-bold text-gray-900">{gap.length.toLocaleString()}</div>
                </div>
                <div className="rounded-xl bg-red-50 border border-red-200 p-5">
                  <div className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Keyword gap</div>
                  <div className="text-4xl font-bold text-red-600">{gapOnly.length.toLocaleString()}+</div>
                  <div className="text-xs text-red-400 mt-1">Competitors rank — you don&apos;t</div>
                </div>
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-5">
                  <div className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">Domains compared</div>
                  <div className="text-4xl font-bold text-blue-600">{gapDomains.length}</div>
                </div>
              </div>
            </>
          )}

          {/* OPPORTUNITIES */}
          {current.id === "opportunities" && (
            <>
              <div>
                <p className="text-xs font-semibold text-red-500 uppercase tracking-widest mb-1">Top Opportunities</p>
                <h2 className="text-2xl font-bold text-gray-900">Keywords competitors rank for — {mainDomain} doesn&apos;t</h2>
              </div>
              <table className="w-full text-xs mt-3">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="text-left py-1.5 font-semibold">Keyword</th>
                    <th className="text-right font-semibold w-20">Volume</th>
                    <th className="text-right font-semibold w-16">KD</th>
                    {gapDomains.slice(1).map((d) => (
                      <th key={d} className="text-center font-semibold w-24">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gapOnly.map((kw, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-1 font-medium text-gray-800">{kw.keyword}</td>
                      <td className="py-1 text-right tabular-nums text-gray-600 font-medium">
                        {kw.search_volume.toLocaleString()}
                      </td>
                      <td className="py-1 text-right tabular-nums text-gray-400">{kw.keyword_difficulty}</td>
                      {gapDomains.slice(1).map((d) => (
                        <td key={d} className="py-1 text-center">
                          {kw.positions[d] ? (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${posBadge(kw.positions[d])}`}>
                              #{kw.positions[d]}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
            <span className="text-xs text-gray-300">Powered by DataForSEO</span>
            <span className="text-xs text-gray-300">{slide + 1} / {total}</span>
          </div>
        </div>
      </div>

      {/* Nav arrows */}
      <div className="flex items-center gap-4 mt-4 no-print">
        <button
          disabled={slide === 0}
          onClick={() => setSlide(slide - 1)}
          className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-xl disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-white/70 text-sm">{slide + 1} / {total}</span>
        <button
          disabled={slide === total - 1}
          onClick={() => setSlide(slide + 1)}
          className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-xl disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
