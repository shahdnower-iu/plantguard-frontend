"use client"

// app/dashboard/analytics/page.tsx

import { useEffect, useState, useMemo } from "react"
import {
  TrendingUp, TrendingDown, Minus, Leaf, AlertTriangle,
  CheckCircle2, Activity, BarChart2, Calendar, Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from "recharts"
import { analytics, type PlantOverview } from "@/lib/api"
import { usePlants } from "@/context/AppContext"

// ─── Palette ──────────────────────────────────────────────────────────────────

const PIE_COLORS = ["#4ade80", "#f87171", "#fbbf24", "#60a5fa", "#c084fc"]
const TREND_COLORS: Record<string, string> = {
  improving: "#4ade80",
  stable: "#60a5fa",
  declining: "#f87171",
  no_data: "#9ca3af",
  insufficient_data: "#9ca3af",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number | null) {
  if (score === null) return "text-muted-foreground"
  if (score >= 70) return "text-emerald-600"
  if (score >= 40) return "text-amber-500"
  return "text-red-500"
}

function scoreBg(score: number | null) {
  if (score === null) return "bg-muted/40"
  if (score >= 70) return "bg-emerald-100 text-emerald-700"
  if (score >= 40) return "bg-amber-100 text-amber-700"
  return "bg-red-100 text-red-600"
}

function nowMonth() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; accent: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex gap-4 items-start">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 flex flex-col items-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
    </div>
  )
}

const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 10,
    fontSize: 12,
  },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { plants } = usePlants()

  const [overview, setOverview] = useState<PlantOverview[]>([])
  const [report, setReport] = useState<any | null>(null)
  const [overviewLoading, setOvL] = useState(true)
  const [reportLoading, setRL] = useState(true)
  const [selectedMonth, setMonth] = useState(nowMonth)

  // Fetch overview
  useEffect(() => {
    analytics.overview()
      .then(d => {
        const raw = d as any
        let list: any[] = []

        if (Array.isArray(raw)) list = raw
        else if (Array.isArray(raw?.plants)) list = raw.plants
        else if (Array.isArray(raw?.data)) list = raw.data

        // Normalize field names — service now returns the correct names but keep fallbacks
        const normalized = list.map(p => ({
          plantId: p.plantId || p.plant_id,
          name: p.name || p.plantName,
          // FIX: service now returns latestHealthScore (was latestScore)
          latestHealthScore: p.latestHealthScore ?? p.latestScore ?? null,
          // FIX: service now returns scanCount (was totalScans)
          scanCount: p.scanCount ?? p.totalScans ?? 0,
          // FIX: service now returns trend as a string (was a TrendResult object)
          trend: typeof p.trend === 'object' ? (p.trend?.direction ?? 'no_data') : (p.trend || 'no_data'),
          lastScanned: p.lastScanned ?? null,
        })).filter(p => p.plantId)

        setOverview(normalized)
      })
      .catch(err => {
        console.error("Overview fetch failed", err)
        setOverview([])
      })
      .finally(() => setOvL(false))
  }, [])

  // Fetch monthly report
  useEffect(() => {
    setRL(true)
    analytics.monthlyReport(selectedMonth)
      .then(d => setReport(d))
      .catch(() => setReport(null))
      .finally(() => setRL(false))
  }, [selectedMonth])

  // Derived stats
  const scored = overview.filter(p => p.latestHealthScore !== null)
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, p) => s + (p.latestHealthScore ?? 0), 0) / scored.length)
    : 0

  const healthyCount = scored.filter(p => (p.latestHealthScore ?? 0) >= 70).length
  const criticalCount = scored.filter(p => (p.latestHealthScore ?? 0) < 50).length

  // Charts
  const healthBarData = useMemo(() =>
    [...overview]
      .filter(p => p.latestHealthScore !== null)
      .sort((a, b) => (b.latestHealthScore ?? 0) - (a.latestHealthScore ?? 0))
      .map(p => ({
        name: (p.name ?? "Unknown").length > 11
          ? (p.name ?? "Unknown").slice(0, 11) + "…"
          : (p.name ?? "Unknown"),
        score: p.latestHealthScore ?? 0,
        scans: p.scanCount ?? 0,
      })),
    [overview]
  )

  // Trend pie — merge no_data + insufficient_data into one slice so legend never duplicates
  const trendPieData = useMemo(() => {
    const noDataCount = overview.filter(p => p.trend === "no_data" || p.trend === "insufficient_data").length
    const base = (["improving", "stable", "declining"] as const)
      .map(t => ({ name: t.charAt(0).toUpperCase() + t.slice(1), value: overview.filter(p => p.trend === t).length, key: t as string }))
      .filter(d => d.value > 0)
    if (noDataCount > 0) base.push({ name: "No Data", value: noDataCount, key: "no_data" })
    return base
  }, [overview])

  // Scan pie — fixed colors per label so Healthy=green, Diseased=red regardless of order
  const scanPieData = report
    ? [
        { name: "Healthy",  value: report.healthyScans  ?? 0, color: "#4ade80" },
        { name: "Diseased", value: report.diseasedScans ?? 0, color: "#f87171" },
      ].filter(d => d.value > 0)
    : []

  // FIX: topDiseases is now returned by the service
  const diseaseData = (report?.topDiseases ?? []).map((d: any) => ({
    name: d.name?.length > 16 ? d.name.slice(0, 16) + "…" : d.name,
    count: d.count,
  }))

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Insights into your garden's health</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Month</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setMonth(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* KPI Cards */}
      {overviewLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Plants" value={plants.length} icon={Leaf} accent="bg-primary/10 text-primary" />
          <KpiCard label="Healthy Plants" value={healthyCount} icon={CheckCircle2} accent="bg-emerald-500/10 text-emerald-600" />
          <KpiCard label="Need Attention" value={criticalCount} icon={AlertTriangle} accent="bg-red-500/10 text-red-500" />
          <KpiCard
            label="Avg Health Score"
            value={avgScore ? `${avgScore}/100` : "—"}
            sub={avgScore ? `Based on ${scored.length} scanned plant${scored.length !== 1 ? "s" : ""}` : "No scans yet"}
            icon={Activity}
            accent="bg-blue-500/10 text-blue-500"
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview">Plant Overview</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {overviewLoading ? (
            <div className="h-64 rounded-2xl bg-muted animate-pulse" />
          ) : healthBarData.length === 0 ? (
            <EmptyState icon={BarChart2} message="No scan data yet. Scan your plants to see health scores here." />
          ) : (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Health Scores by Plant</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={healthBarData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {healthBarData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.score >= 70 ? "#4ade80" : entry.score >= 40 ? "#fbbf24" : "#f87171"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Priority Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/30">
              <h3 className="text-sm font-semibold text-foreground">Plants by Health Priority</h3>
            </div>
            {overview.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">No plants tracked yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {[...overview]
                  // FIX: sort nulls (unscanned) to the bottom
                  .sort((a, b) => {
                    if (a.latestHealthScore === null && b.latestHealthScore === null) return 0
                    if (a.latestHealthScore === null) return 1
                    if (b.latestHealthScore === null) return -1
                    return a.latestHealthScore - b.latestHealthScore
                  })
                  .map(p => (
                    <div key={p.plantId} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                        p.latestHealthScore === null ? "bg-muted-foreground/40"
                        : p.latestHealthScore >= 70 ? "bg-emerald-500"
                        : p.latestHealthScore >= 40 ? "bg-amber-500"
                        : "bg-red-500"
                      }`} />

                      <span className="flex-1 text-sm font-medium text-foreground truncate">
                        {p.name || "Unnamed Plant"}
                      </span>

                      <span className="shrink-0">
                        {p.trend === "improving" && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                        {p.trend === "declining" && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                        {p.trend === "stable" && <Minus className="h-3.5 w-3.5 text-blue-400" />}
                      </span>

                      <span className="text-xs text-muted-foreground shrink-0">
                        {p.scanCount} scan{p.scanCount !== 1 ? "s" : ""}
                      </span>

                      {p.latestHealthScore !== null ? (
                        <Badge className={`text-xs shrink-0 ${scoreBg(p.latestHealthScore)}`}>
                          {p.latestHealthScore}/100
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs shrink-0">No data</Badge>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── MONTHLY TAB ──────────────────────────────────────────────────── */}
        <TabsContent value="monthly" className="mt-4 space-y-4">
          {reportLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
            </div>
          ) : !report ? (
            <EmptyState icon={Calendar} message="No report data for this month yet." />
          ) : (
            <>
              {/* FIX: all field names now match what the service returns */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="Total Scans"    value={report.totalScans ?? 0}   icon={Activity}      accent="bg-primary/10 text-primary" />
                <KpiCard label="Healthy Scans"  value={report.healthyScans ?? 0} icon={CheckCircle2}  accent="bg-emerald-500/10 text-emerald-600" />
                {/* FIX: was report.diseasedScans (now matches service) */}
                <KpiCard label="Diseased Scans" value={report.diseasedScans ?? 0} icon={AlertTriangle} accent="bg-red-500/10 text-red-500" />
                {/* FIX: was report.newPlants (now matches service) */}
                <KpiCard label="New Plants"      value={report.newPlants ?? 0}    icon={Leaf}          accent="bg-primary/10 text-primary" />
              </div>

              {/* Insight sentence */}
              {report.insight && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm text-foreground leading-relaxed">{report.insight}</p>
                </div>
              )}

              {/* FIX: avgHealthScore (was overallHealthScore) */}
              {report.totalScans > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Overall Health Score</h3>
                  <div className="flex items-center gap-4">
                    <span className={`text-3xl font-bold ${scoreColor(report.avgHealthScore ?? null)}`}>
                      {report.avgHealthScore ?? "—"}/100
                    </span>
                    <Progress value={report.avgHealthScore ?? 0} className="flex-1 h-3" />
                  </div>
                </div>
              )}

              {/* Scan breakdown pie */}
              {scanPieData.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Scan Breakdown</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={scanPieData}
                        cx="50%" cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                      >
                        {scanPieData.map((entry, i) => (
                          <Cell key={i} fill={(entry as any).color} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* FIX: topDiseases chart (now returned by service) */}
              {diseaseData.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Top Diseases This Month</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={diseaseData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                      <Tooltip {...tooltipStyle} />
                      <Bar dataKey="count" fill="#f87171" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Per-plant summaries */}
              {(report.plantSummaries ?? []).length > 0 && (
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                    <h3 className="text-sm font-semibold text-foreground">Plant Summaries</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {report.plantSummaries.map((ps: any) => (
                      <div key={ps.plantId} className="px-5 py-3 flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                          ps.averageScore >= 70 ? "bg-emerald-500"
                          : ps.averageScore >= 40 ? "bg-amber-500"
                          : "bg-red-500"
                        }`} />
                        <span className="flex-1 text-sm font-medium text-foreground truncate">{ps.plantName}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{ps.scansThisMonth} scan{ps.scansThisMonth !== 1 ? "s" : ""}</span>
                        <Badge className={`text-xs shrink-0 ${scoreBg(ps.averageScore)}`}>
                          {ps.averageScore}/100
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── TRENDS TAB ───────────────────────────────────────────────────── */}
        <TabsContent value="trends" className="mt-4 space-y-4">
          {overviewLoading ? (
            <div className=" gap-4 ">
              {[1, 2].map(i => <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />)}
            </div>
          ) : trendPieData.length === 0 ? (
            <EmptyState icon={TrendingUp} message="Scan your plants regularly to see health trends." />
          ) : (
            <div className=" gap-4 ">
              {/* FIX: trend pie now works because trend is a plain string */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Trend Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={trendPieData}
                      cx="50%" cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                    >
                      {trendPieData.map((entry, i) => (
                        <Cell key={i} fill={TREND_COLORS[entry.key] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Health score bar for all scanned plants */}
            
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}