
"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { spread, plants, Plant } from "@/lib/api";
import type { SpreadScanResult } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterType = "all" | "diseased" | "valid" | "invalid";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPlantEmoji(type?: string) {
  const t = (type ?? "").toLowerCase();
  if (t.includes("tomato")) return "🍅";
  if (t.includes("pepper")) return "🫑";
  if (t.includes("cucumber")) return "🥒";
  if (t.includes("basil")) return "🌿";
  if (t.includes("corn") || t.includes("maize")) return "🌽";
  if (t.includes("apple")) return "🍎";
  if (t.includes("grape")) return "🍇";
  if (t.includes("potato")) return "🥔";
  if (t.includes("strawberry")) return "🍓";
  return "🌱";
}

const SEVERITY_STYLES: Record<string, { bar: string; badge: string }> = {
  mild:     { bar: "bg-yellow-400",  badge: "bg-yellow-50 text-yellow-800 border-yellow-200" },
  moderate: { bar: "bg-orange-400",  badge: "bg-orange-50 text-orange-800 border-orange-200" },
  severe:   { bar: "bg-red-500",     badge: "bg-red-50 text-red-800 border-red-200" },
  critical: { bar: "bg-red-700",     badge: "bg-red-100 text-red-900 border-red-300" },
};

const RISK_STYLES: Record<string, string> = {
  Safe:     "bg-emerald-50 text-emerald-800 border-emerald-200",
  Monitor:  "bg-sky-50 text-sky-800 border-sky-200",
  "Act Now":"bg-orange-50 text-orange-800 border-orange-200",
  Urgent:   "bg-red-50 text-red-800 border-red-200",
};

const CONTAGION_STYLES: Record<string, string> = {
  low:    "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-500 dark:text-amber-400",
  high:   "text-red-500 dark:text-red-400",
};

const HEALTH_STYLES: Record<string, string> = {
  GOOD: "bg-emerald-50 text-emerald-700",
  FAIR: "bg-amber-50 text-amber-700",
  POOR: "bg-red-50 text-red-700",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, accent, sub }: {
  label: string;
  value: string | number;
  accent?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${accent ?? "text-gray-900 dark:text-gray-50"}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function SpreadMeter({ value }: { value: number }) {
  const pct = Math.round(value);
  const color =
    pct >= 75 ? "bg-red-500"
    : pct >= 50 ? "bg-orange-400"
    : pct >= 25 ? "bg-yellow-400"
    : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300 w-9 text-right">
        {pct}%
      </span>
    </div>
  );
}

function ConfidenceDot({ value }: { value: number }) {
  const pct = Math.round(value);
  const color = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${color}`} aria-hidden="true" />
      <span className="text-xs text-gray-500 tabular-nums">{pct}%</span>
    </span>
  );
}

function Tag({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-md border ${className}`}>
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
      {children}
    </h3>
  );
}

function InfoGrid({ rows }: { rows: { k: string; v: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
      {rows.map(({ k, v }) => (
        <div key={k}>
          <dt className="text-[10px] text-gray-400 mb-0.5">{k}</dt>
          <dd className="text-xs font-medium text-gray-800 dark:text-gray-200">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function BulletList({ items, color }: { items: string[]; color: "amber" | "emerald" | "sky" }) {
  const dot: Record<string, string> = {
    amber: "bg-amber-400",
    emerald: "bg-emerald-500",
    sky: "bg-sky-400",
  };
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot[color]}`} aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function ImageStrip({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  return (
    <div className="flex gap-2 flex-wrap">
      {urls.map((url, i) => (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-16 h-16 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 flex-shrink-0 hover:opacity-80 transition-opacity"
          aria-label={`Scan image ${i + 1}`}
        >
          <Image
            src={url}
            alt={`Scan image ${i + 1}`}
            width={64}
            height={64}
            className="object-cover w-full h-full"
          />
        </a>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/5" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/5" />
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-full mt-3" />
        </div>
        <div className="w-20 space-y-2">
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ filter }: { filter: FilterType }) {
  const msgs: Record<FilterType, { icon: string; title: string; sub: string }> = {
    all:      { icon: "📋", title: "No spread scans yet",     sub: "Upload plant photos to run your first spread analysis." },
    diseased: { icon: "🌿", title: "No diseased scans",       sub: "No scans with detected disease found." },
    valid:    { icon: "🔬", title: "No valid scans",          sub: "Try a different filter." },
    invalid:  { icon: "⚠️", title: "No invalid scans",       sub: "All your scans processed successfully." },
  };
  const { icon, title, sub } = msgs[filter];
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4" role="img" aria-label={title}>{icon}</div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
      <p className="text-xs text-gray-400 dark:text-gray-600 max-w-xs">{sub}</p>
    </div>
  );
}

// ─── Scan Card ────────────────────────────────────────────────────────────────

function ScanCard({
  scan,
  plant,
  expanded,
  onToggle,
}: {
  scan: SpreadScanResult;
  plant?: Plant;
  expanded: boolean;
  onToggle: () => void;
}) {
  const emoji = getPlantEmoji(plant?.plantType);
  const severityStyle = SEVERITY_STYLES[(scan.severity ?? "").toLowerCase()];
  const riskStyle = scan.riskLabel ? RISK_STYLES[scan.riskLabel] : undefined;
  const firstImage = scan.imageUrls?.[0];

  return (
    <article
      className={`rounded-2xl border bg-white dark:bg-gray-900 transition-all duration-200 overflow-hidden
        ${expanded
          ? "border-gray-300 dark:border-gray-600 shadow-sm"
          : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
        }`}
    >
      {/* ── Main row ── */}
      <button
        className="w-full text-left flex items-start gap-4 p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-2xl"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        {/* Thumbnail */}
        <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-2xl">
          {firstImage ? (
            <Image src={firstImage} alt={plant?.name ?? "Plant"} width={56} height={56} className="object-cover w-full h-full" />
          ) : (
            <span role="img" aria-label={plant?.plantType ?? "plant"}>{emoji}</span>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          {/* Row 1 — title + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {!scan.valid ? (
              <span className="text-sm font-semibold text-gray-400 line-through">Invalid scan</span>
            ) : scan.diseaseName ? (
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">{scan.diseaseName}</span>
            ) : (
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">No disease detected</span>
            )}

            {scan.valid && severityStyle && (
              <Tag className={severityStyle.badge}>
                {scan.severity!.charAt(0).toUpperCase() + scan.severity!.slice(1)}
              </Tag>
            )}
            {riskStyle && (
              <Tag className={riskStyle}>{scan.riskLabel}</Tag>
            )}
            {scan.plantCreated && (
              <Tag className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
                New plant
              </Tag>
            )}
            {!scan.valid && (
              <Tag className="bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
                Rejected
              </Tag>
            )}
          </div>

          {/* Row 2 — plant + pathogen + images count */}
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m9-9h-2.25M5.25 12H3m15.364-6.364l-1.591 1.591M7.227 16.773l-1.591 1.591M18.364 18.364l-1.591-1.591M7.227 7.227L5.636 5.636" />
              </svg>
              {plant?.name ?? "Unknown plant"}
            </span>
            {scan.pathogenType && (
              <span className="text-xs text-gray-400 capitalize">{scan.pathogenType}</span>
            )}
            {scan.diseaseStage && (
              <span className="text-xs text-gray-400 capitalize">{scan.diseaseStage} stage</span>
            )}
            <span className="text-xs text-gray-300 dark:text-gray-600">
              {scan.imagesAnalyzed} {scan.imagesAnalyzed === 1 ? "image" : "images"}
            </span>
          </div>

          {/* Row 3 — spread meter */}
          {scan.valid && scan.spreadPercentage !== undefined && (
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-gray-400 w-12 flex-shrink-0">Spread</span>
              <div className="flex-1 max-w-xs">
                <SpreadMeter value={scan.spreadPercentage} />
              </div>
              {scan.confidence !== undefined && <ConfidenceDot value={scan.confidence} />}
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-[11px] text-gray-400">{formatDate(scan.createdAt)}</p>
            <p className="text-[11px] text-gray-300 dark:text-gray-600">{formatTime(scan.createdAt)}</p>
          </div>
          <svg
            className={`w-4 h-4 text-gray-300 dark:text-gray-600 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* ── Expanded panel ── */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-5 flex flex-col gap-6 animate-in fade-in slide-in-from-top-1 duration-150">

          {/* Scan images */}
          {scan.imageUrls?.length > 0 && (
            <section aria-label="Scan images">
              <SectionTitle>Scan images</SectionTitle>
              <ImageStrip urls={scan.imageUrls} />
            </section>
          )}

          {/* Invalid banner */}
          {!scan.valid && (
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Scan rejected</p>
                {scan.rejectReason && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{scan.rejectReason}</p>
                )}
              </div>
            </div>
          )}

          {/* Plant info */}
          {plant && (
            <section aria-label="Plant information">
              <SectionTitle>Plant info</SectionTitle>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                    {plant.imageUrl
                      ? <Image src={plant.imageUrl} alt={plant.name} width={40} height={40} className="object-cover w-full h-full rounded-xl" />
                      : <span role="img" aria-label={plant.plantType}>{emoji}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">{plant.name}</p>
                    <p className="text-xs text-gray-400">{plant.plantType}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${HEALTH_STYLES[(plant as any).healthStatus ?? "FAIR"] ?? HEALTH_STYLES.FAIR}`}>
                    {(plant as any).healthStatus ?? "Unknown"}
                  </span>
                </div>
                <InfoGrid rows={[
                  { k: "Plant ID", v: <code className="font-mono text-[10px]">{plant.plant_id}</code> },
                  ...(plant.location ? [{ k: "Location", v: plant.location }] : []),
                  ...(plant.notes ? [{ k: "Notes", v: plant.notes }] : []),
                ]} />
              </div>
            </section>
          )}

          {/* Detection metrics */}
          {scan.valid && (
            <section aria-label="Detection metrics">
              <SectionTitle>Spread metrics</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                {/* Spread */}
                {scan.spreadPercentage !== undefined && (
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 p-4">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Spread</p>
                    <SpreadMeter value={scan.spreadPercentage} />
                    {scan.affectedAreaEstimate && (
                      <p className="text-[11px] text-gray-400 mt-2">{scan.affectedAreaEstimate}</p>
                    )}
                  </div>
                )}

                {/* Severity / Stage */}
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 p-4">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Severity & stage</p>
                  <div className="flex flex-col gap-2">
                    {scan.severity && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Severity</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${severityStyle?.badge ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                          {scan.severity}
                        </span>
                      </div>
                    )}
                    {scan.diseaseStage && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Stage</span>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{scan.diseaseStage}</span>
                      </div>
                    )}
                    {scan.spreadRate && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Spread rate</span>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{scan.spreadRate}</span>
                      </div>
                    )}
                    {scan.confidence !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Confidence</span>
                        <ConfidenceDot value={scan.confidence} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Risk */}
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 p-4">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Risk</p>
                  <div className="flex flex-col gap-2">
                    {scan.riskLabel && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Risk label</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${riskStyle ?? ""}`}>
                          {scan.riskLabel}
                        </span>
                      </div>
                    )}
                    {scan.contagionRisk && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Contagion</span>
                        <span className={`text-xs font-semibold capitalize ${CONTAGION_STYLES[scan.contagionRisk] ?? ""}`}>
                          {scan.contagionRisk}
                        </span>
                      </div>
                    )}
                    {scan.pathogenType && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Pathogen</span>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{scan.pathogenType}</span>
                      </div>
                    )}
                    {scan.requiresLabConfirm !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Lab confirm</span>
                        <span className={`text-xs font-semibold ${scan.requiresLabConfirm ? "text-orange-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {scan.requiresLabConfirm ? "Required" : "Not needed"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Analysis */}
          {scan.valid && (scan.analysis || scan.riskToPlant || scan.plantPartAffected?.length || scan.visualSymptoms?.length) && (
            <section aria-label="Analysis">
              <SectionTitle>Analysis</SectionTitle>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="flex flex-col gap-4">
                  {scan.analysis && (
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 p-4">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Expert summary</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{scan.analysis}</p>
                    </div>
                  )}
                  {scan.riskToPlant && (
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 p-4">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Risk to plant</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{scan.riskToPlant}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-4">
                  {scan.plantPartAffected?.length > 0 && (
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 p-4">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2.5">Affected parts</p>
                      <div className="flex flex-wrap gap-1.5">
                        {scan.plantPartAffected.map((part, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 capitalize">
                            {part}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {scan.visualSymptoms?.length > 0 && (
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 p-4">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2.5">Visual symptoms</p>
                      <BulletList items={scan.visualSymptoms} color="sky" />
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Recommendations */}
          {scan.recommendations?.length > 0 && (
            <section aria-label="Recommendations">
              <SectionTitle>Recommendations</SectionTitle>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 p-4">
                <BulletList items={scan.recommendations} color="emerald" />
              </div>
            </section>
          )}

          {/* Scan meta */}
          <section aria-label="Scan metadata">
            <SectionTitle>Scan details</SectionTitle>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 p-4">
              <InfoGrid rows={[
                { k: "Scan ID",       v: <code className="font-mono text-[10px]">{scan.scanId}</code> },
                { k: "Plant ID",      v: <code className="font-mono text-[10px]">{scan.plantId}</code> },
                { k: "Images",        v: `${scan.imagesAnalyzed} uploaded` },
                { k: "Auto-created",  v: scan.plantCreated ? "Yes" : "No" },
                { k: "Model",         v: scan._meta?.model ?? "—" },
                { k: "Analyzed at",   v: scan._meta?.analyzed_at ? `${formatDate(scan._meta.analyzed_at)} ${formatTime(scan._meta.analyzed_at)}` : "—" },
              ]} />
            </div>
          </section>

        </div>
      )}
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SpreadHistoryPage() {
  const [scans, setScans] = useState<SpreadScanResult[]>([]);
  const [plantMap, setPlantMap] = useState<Record<string, Plant>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [spreadRes, plantsRes] = await Promise.all([
        spread.history(),
        plants.list(),
      ]);

      setScans(spreadRes.scans);

      const map: Record<string, Plant> = {};
      plantsRes.plants.forEach((p) => { map[p.plant_id] = p; });
      setPlantMap(map);
    } catch (err: any) {
      setError(err.message ?? "Failed to load spread scan history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = scans.filter((s) => {
    if (filter === "diseased") return s.valid && !!s.diseaseName;
    if (filter === "valid")    return s.valid;
    if (filter === "invalid")  return !s.valid;
    return true;
  });

  const stats = {
    total:    scans.length,
    diseased: scans.filter((s) => s.valid && !!s.diseaseName).length,
    invalid:  scans.filter((s) => !s.valid).length,
    avgSpread: scans.length > 0
      ? Math.round(scans.filter(s => s.spreadPercentage !== undefined).reduce((a, s) => a + (s.spreadPercentage ?? 0), 0) /
          Math.max(scans.filter(s => s.spreadPercentage !== undefined).length, 1))
      : 0,
  };

  const FILTERS: { key: FilterType; label: string; count?: number }[] = [
    { key: "all",      label: "All",      count: scans.length },
    { key: "diseased", label: "Diseased", count: stats.diseased },
    { key: "valid",    label: "Valid",    count: scans.filter(s => s.valid).length },
    { key: "invalid",  label: "Invalid",  count: stats.invalid },
  ];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="w-full px-4 py-8 sm:px-6 lg:px-10 xl:px-16">

        {/* ── Header ── */}
        <header className="mb-7 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50 tracking-tight">
              Spread analysis history
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Multi-image disease spread results for all your plants
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            aria-label="Refresh spread history"
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40 bg-white dark:bg-gray-900"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
        </header>

        {/* ── Stats ── */}
        {!loading && !error && scans.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
            <StatCard label="Total scans"  value={stats.total} />
            <StatCard label="Diseased"     value={stats.diseased} accent="text-red-500" />
            <StatCard label="Avg spread"   value={`${stats.avgSpread}%`} accent="text-orange-500" />
            <StatCard label="Rejected"     value={stats.invalid} accent="text-gray-400" />
          </div>
        )}

        {/* ── Filters ── */}
        {!loading && !error && (
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {FILTERS.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`text-xs px-3.5 py-1.5 rounded-full border transition-all duration-150 font-medium
                  ${filter === key
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white"
                    : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
              >
                {label}
                {count !== undefined && (
                  <span className="ml-1.5 opacity-60">{count}</span>
                )}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400">
              {filtered.length} {filtered.length === 1 ? "scan" : "scans"}
            </span>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div role="alert" className="rounded-xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 flex items-start gap-3 mb-5">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Failed to load scans</p>
              <p className="text-xs text-red-600/70 dark:text-red-500/70 mt-0.5">{error}</p>
              <button onClick={fetchData} className="text-xs text-red-600 dark:text-red-400 underline mt-2 hover:no-underline">
                Try again
              </button>
            </div>
          </div>
        )}

        {/* ── Skeletons ── */}
        {loading && (
          <div className="flex flex-col gap-3" aria-label="Loading scans" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Scan list ── */}
      
   {!loading && !error && (
  filtered.length === 0
    ? <EmptyState filter={filter} />
    : (
      <div className="flex flex-col gap-3" role="list" aria-label="Spread scan history">
        {filtered.map((scan, index) => (
          <div 
            role="listitem" 
            key={scan.scanId || `scan-${index}`}   // ← Fixed
          >
            <ScanCard
              scan={scan}
              plant={plantMap[scan.plantId]}
              expanded={expandedId === scan.scanId}
              onToggle={() => setExpandedId(expandedId === scan.scanId ? null : scan.scanId)}
            />
          </div>
        ))}
      </div>
    )
)}

      </div>
    </main>
  );
}