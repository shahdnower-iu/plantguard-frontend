
"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { detect, plants, Plant } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanRecord = {
  scan_id: string;
  plantId: string;
  plantCreated?: boolean;
  imageUrl?: string;
  healthy: boolean;
  disease?: string | null;
  diagnosis: string;
  confidence: number;
  pathogenType?: string;
  inferenceMs?: number;
  recommendation?: string;
  advice?: {
    disease_overview: string;
    cause: string;
    treatment: string[];
    prevention: string[];
    urgency: "low" | "medium" | "high" | "critical";
  } | null;
  _meta?: {
    yolo_model: string;
    gemini_model: string;
    analyzed_at: string;
  };
  createdAt: string;
};

type FilterType = "all" | "diseased" | "healthy";

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

function diagnosisLabel(raw: string) {
  return raw.replace(/___/g, " — ").replace(/_/g, " ");
}

const URGENCY_STYLES: Record<string, string> = {
  low: "bg-green-50 text-green-800 border-green-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  high: "bg-orange-50 text-orange-800 border-orange-200",
  critical: "bg-red-50 text-red-800 border-red-200",
  healthy: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

const HEALTH_STYLES: Record<string, string> = {
  GOOD: "bg-emerald-50 text-emerald-700",
  POOR: "bg-red-50 text-red-700",
  FAIR: "bg-amber-50 text-amber-700",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl bg-white/60 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-4 backdrop-blur-sm">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5 font-medium uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`text-2xl font-semibold tabular-nums ${accent ?? "text-gray-900 dark:text-gray-50"}`}
      >
        {value}
      </p>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 75
      ? "bg-emerald-500"
      : pct >= 50
        ? "bg-amber-400"
        : "bg-red-400";
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[11px] text-gray-400 tabular-nums w-7 text-right">
        {pct}%
      </span>
      <span className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
        <span
          className={`block h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  );
}

function ScanCard({
  scan,
  plant,
  expanded,
  onToggle,
}: {
  scan: ScanRecord;
  plant?: Plant;
  expanded: boolean;
  onToggle: () => void;
}) {
  const emoji = getPlantEmoji(plant?.plantType);
  const urgency = scan.advice?.urgency ?? (scan.healthy ? "healthy" : undefined);

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
        className="w-full text-left flex items-start gap-3 p-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-2xl"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        {/* Thumbnail */}
        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-2xl flex-shrink-0 overflow-hidden">
          {scan.imageUrl ? (
            <Image
              src={scan.imageUrl}
              alt={plant?.name ?? "Plant"}
              width={56}
              height={56}
              className="object-cover w-full h-full"
            />
          ) : (
            <span role="img" aria-label={plant?.plantType ?? "plant"}>
              {emoji}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {scan.healthy ? (
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Healthy
              </span>
            ) : (
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                {scan.disease ?? diagnosisLabel(scan.diagnosis)}
              </span>
            )}
            {urgency && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${URGENCY_STYLES[urgency] ?? URGENCY_STYLES.medium}`}
              >
                {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
              </span>
            )}
            {scan.plantCreated && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
                New plant
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m9-9h-2.25M5.25 12H3m15.364-6.364l-1.591 1.591M7.227 16.773l-1.591 1.591M18.364 18.364l-1.591-1.591M7.227 7.227L5.636 5.636" />
              </svg>
              {plant?.name ?? "Unknown plant"}
            </span>
            {scan.pathogenType && scan.pathogenType !== "none" && (
              <span className="text-xs text-gray-400 capitalize">
                {scan.pathogenType}
              </span>
            )}
            <ConfidenceBar value={scan.confidence} />
          </div>
        </div>

        {/* Right side */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-[11px] text-gray-400">{formatDate(scan.createdAt)}</p>
            <p className="text-[11px] text-gray-300 dark:text-gray-600">{formatTime(scan.createdAt)}</p>
          </div>
          <svg
            className={`w-4 h-4 text-gray-300 dark:text-gray-600 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* ── Expanded panel ── */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-5 animate-in fade-in slide-in-from-top-1 duration-150">

          {/* Plant info */}
          {plant && (
            <section aria-label="Plant information">
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
                Plant info
              </h3>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 p-3.5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 flex items-center justify-center text-lg flex-shrink-0">
                    {plant.imageUrl ? (
                      <Image src={plant.imageUrl} alt={plant.name} width={36} height={36} className="object-cover w-full h-full rounded-lg" />
                    ) : (
                      <span role="img" aria-label={plant.plantType}>{emoji}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">{plant.name}</p>
                    <p className="text-xs text-gray-400">{plant.plantType}</p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                      HEALTH_STYLES[(plant as any).healthStatus ?? "FAIR"] ?? HEALTH_STYLES.FAIR
                    }`}
                  >
                    {(plant as any).healthStatus ?? "Unknown"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs border-t border-gray-100 dark:border-gray-700 pt-2.5">
                  <InfoRow k="Plant ID" v={<code className="font-mono text-[10px]">{plant.plant_id}</code>} />
                  {plant.location && <InfoRow k="Location" v={plant.location} />}
                  {plant.notes && <InfoRow k="Notes" v={plant.notes} wide />}
                </div>
              </div>
            </section>
          )}

          {/* Scan details + model meta */}
          <section aria-label="Scan details">
            <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
              Scan details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 p-3.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Detection
                </p>
                <dl className="flex flex-col gap-1.5">
                  <InfoRow k="Scan ID" v={<code className="font-mono text-[10px]">{scan.scan_id}</code>} />
                  <InfoRow k="Diagnosis" v={diagnosisLabel(scan.diagnosis)} />
                  <InfoRow k="Confidence" v={`${Math.round(scan.confidence * 100)}%`} />
                  {scan.pathogenType && scan.pathogenType !== "none" && (
                    <InfoRow k="Pathogen" v={<span className="capitalize">{scan.pathogenType}</span>} />
                  )}
                  {scan.inferenceMs !== undefined && (
                    <InfoRow k="Inference" v={`${scan.inferenceMs} ms`} />
                  )}
                  <InfoRow k="Auto-created" v={scan.plantCreated ? "Yes" : "No"} />
                </dl>
              </div>

              {scan._meta && (
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 p-3.5">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Model metadata
                  </p>
                  <dl className="flex flex-col gap-1.5">
                    <InfoRow k="Vision model" v={scan._meta.yolo_model} />
                    <InfoRow k="Advice model" v={scan._meta.gemini_model} />
                    <InfoRow
                      k="Analyzed at"
                      v={`${formatDate(scan._meta.analyzed_at)} ${formatTime(scan._meta.analyzed_at)}`}
                    />
                  </dl>
                </div>
              )}
            </div>
          </section>

          {/* Disease advice */}
          {scan.advice ? (
            <section aria-label="Disease advice">
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
                Disease advice
              </h3>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 p-4 flex flex-col gap-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {scan.advice.disease_overview}
                </p>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    Cause
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{scan.advice.cause}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AdviceList title="Treatment" items={scan.advice.treatment} color="amber" />
                  <AdviceList title="Prevention" items={scan.advice.prevention} color="emerald" />
                </div>
              </div>
            </section>
          ) : scan.healthy ? (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 p-3.5 flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                Plant appears healthy — no disease advice needed.
              </p>
            </div>
          ) : (
            scan.recommendation && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 p-3.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Recommendation
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{scan.recommendation}</p>
              </div>
            )
          )}
        </div>
      )}
    </article>
  );
}

function InfoRow({
  k,
  v,
  wide,
}: {
  k: string;
  v: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`flex justify-between items-start gap-3 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-gray-400 text-xs flex-shrink-0">{k}</dt>
      <dd className="text-xs text-gray-700 dark:text-gray-300 font-medium text-right">{v}</dd>
    </div>
  );
}

function AdviceList({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: "amber" | "emerald";
}) {
  const dot =
    color === "amber"
      ? "bg-amber-400"
      : "bg-emerald-500";
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
        {title}
      </p>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ filter }: { filter: FilterType }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4" role="img" aria-label="No scans">
        {filter === "diseased" ? "🌿" : filter === "healthy" ? "🔬" : "📋"}
      </div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
        {filter === "all" ? "No scans yet" : `No ${filter} scans found`}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-600">
        {filter === "all"
          ? "Upload a plant photo to run your first scan."
          : "Try a different filter."}
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-start gap-3 animate-pulse">
        <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/5 mb-2.5" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-3 w-12 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScanHistoryPage() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [plantMap, setPlantMap] = useState<Record<string, Plant>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detectRes, plantsRes] = await Promise.all([
        detect.history(),
        plants.list(),
      ]);

      setScans(detectRes.scans as unknown as ScanRecord[]);

      const map: Record<string, Plant> = {};
      plantsRes.plants.forEach((p) => {
        map[p.plant_id] = p;
      });
      setPlantMap(map);
    } catch (err: any) {
      setError(err.message ?? "Failed to load scan history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = scans.filter((s) => {
    if (filter === "diseased") return !s.healthy;
    if (filter === "healthy") return s.healthy;
    return true;
  });

  const stats = {
    total: scans.length,
    diseased: scans.filter((s) => !s.healthy).length,
    healthy: scans.filter((s) => s.healthy).length,
    avgConf:
      scans.length > 0
        ? Math.round(
            (scans.reduce((acc, s) => acc + s.confidence, 0) / scans.length) * 100
          )
        : 0,
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 w-full">
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8 max-w-screen-2xl mx-auto">
        {/* ── Header ── */}
        <header className="mb-6 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50 tracking-tight">
              Scan history
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Disease detection results for all your plants
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40 bg-white dark:bg-gray-900"
            aria-label="Refresh scan history"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
        </header>

        {/* ── Stats ── */}
        {!loading && !error && scans.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard label="Total scans" value={stats.total} />
            <StatCard label="Diseased" value={stats.diseased} accent="text-red-500" />
            <StatCard label="Healthy" value={stats.healthy} accent="text-emerald-600 dark:text-emerald-400" />
            <StatCard label="Avg confidence" value={`${stats.avgConf}%`} />
          </div>
        )}

        {/* ── Filters ── */}
        {!loading && !error && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(["all", "diseased", "healthy"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3.5 py-1.5 rounded-full border transition-all duration-150 font-medium capitalize
                  ${filter === f
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white"
                    : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                aria-pressed={filter === f}
              >
                {f}
                {f !== "all" && (
                  <span className="ml-1.5 opacity-60">
                    {f === "diseased" ? stats.diseased : stats.healthy}
                  </span>
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
          <div
            role="alert"
            className="rounded-xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 flex items-start gap-3 mb-4"
          >
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Failed to load scans
              </p>
              <p className="text-xs text-red-600/70 dark:text-red-500/70 mt-0.5">{error}</p>
              <button
                onClick={fetchData}
                className="text-xs text-red-600 dark:text-red-400 underline mt-2 hover:no-underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* ── Skeleton ── */}
        {loading && (
          <div className="flex flex-col gap-3" aria-label="Loading scans" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* ── Scan list ── */}
        {!loading && !error && (
          filtered.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <div className="flex flex-col gap-3" role="list" aria-label="Scan history">
              {filtered.map((scan) => (
                <div role="listitem" key={scan.scan_id}>
                  <ScanCard
                    scan={scan}
                    plant={plantMap[scan.plantId]}
                    expanded={expandedId === scan.scan_id}
                    onToggle={() =>
                      setExpandedId(
                        expandedId === scan.scan_id ? null : scan.scan_id
                      )
                    }
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