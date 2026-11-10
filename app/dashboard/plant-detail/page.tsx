"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft, Leaf, Droplets, MapPin, Calendar, Activity,
  Plus, CheckCircle2, Trash2, AlertTriangle, ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { plants, detect, type Plant, type CareSchedule } from "@/lib/api"

export default function PlantDetailPage() {
  const params = useSearchParams()
  const router = useRouter()
  const plantId = params.get("id")

  const [plant, setPlant] = useState<Plant | null>(null)
  const [schedules, setSchedules] = useState<CareSchedule[]>([])
  const [scanHistory, setScanHistory] = useState<{ scanId: string; healthy: boolean; confidence: number; disease?: string; createdAt: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!plantId) { router.push("/dashboard/my-plants"); return }

    Promise.all([
      plants.get(plantId),
      plants.getCareSchedule(plantId),
      detect.history(plantId).catch(() => ({ scans: [] })),
    ]).then(([p, s, d]) => {
      setPlant(p.plant)
      setSchedules(s.schedules ?? [])
      // Normalize scan objects from API to match expected local shape
      const scans = ((d.scans ?? []) as any[]).slice(0, 10).map(sx => ({
        scanId: sx.scan_id ?? sx.id ?? "",
        healthy: typeof sx.healthy === "boolean" ? sx.healthy : (sx.disease ? false : true),
        confidence: typeof sx.confidence === "number" ? sx.confidence : (sx.confidence_score ?? 0),
        disease: sx.disease ?? undefined,
        createdAt: sx.created_at ?? sx.createdAt ?? new Date().toISOString(),
      }))
      setScanHistory(scans)
    }).catch(() => router.push("/dashboard/my-plants"))
      .finally(() => setLoading(false))
  }, [plantId, router])

  const handleComplete = async (scheduleId: string) => {
    if (!plantId) return
    try {
      await plants.completeCareTask(plantId, scheduleId)
      setSchedules(prev => prev.map(s => s.care_schedule_id === scheduleId ? { ...s, lastCompleted: new Date().toISOString() } : s))
    } catch {}
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!plantId) return
    try {
      await plants.deleteCareSchedule(plantId, scheduleId)
      setSchedules(prev => prev.filter(s => s.care_schedule_id !== scheduleId))
    } catch {}
  }

  const healthScore = plant?.latestHealthScore ?? null

  // Derive health status: prefer latest scan, fall back to health score
  const latestScan = scanHistory[0] ?? null
  const isHealthy: boolean | null = latestScan
    ? latestScan.healthy
    : healthScore !== null
      ? healthScore >= 70
      : null
  const latestDisease = latestScan && !latestScan.healthy ? latestScan.disease : null

  if (loading) return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-40 bg-muted animate-pulse rounded" />
      <div className="h-64 bg-muted animate-pulse rounded-xl" />
    </div>
  )

  if (!plant) return null

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/my-plants" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> My Plants
      </Link>

      {/* Hero */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative h-48 w-full overflow-hidden rounded-xl sm:h-auto sm:w-56 shrink-0">
          {plant.imageUrl ? (
            <Image src={plant.imageUrl} alt={plant.name} fill className="object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-green-100 to-emerald-200 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center">
              <Leaf className="h-16 w-16 text-green-500/40" />
            </div>
          )}
        </div>

        <div className="flex-1">
          {/* Name + badge */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{plant.name}</h1>
              {plant.scientificName && <p className="text-sm italic text-muted-foreground">{plant.scientificName}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">{plant.plantType}</p>
            </div>
            {healthScore !== null && (
              <Badge className={`${healthScore >= 70 ? "bg-green-100 text-green-700" : healthScore >= 40 ? "bg-amber-100 text-amber-700" : "bg-destructive/10 text-destructive"}`}>
                Score: {healthScore}/100
              </Badge>
            )}
          </div>

          {/* ── Health Status Banner ── */}
          {isHealthy !== null ? (
            <div className={`mt-4 flex items-center gap-3 rounded-xl px-4 py-3 ${
              isHealthy
                ? "bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800"
                : "bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800"
            }`}>
              {isHealthy
                ? <ShieldCheck className="h-6 w-6 shrink-0 text-green-600" />
                : <AlertTriangle className="h-6 w-6 shrink-0 text-red-500" />
              }
              <div>
                <p className={`text-sm font-semibold ${isHealthy ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {isHealthy ? "Plant is Healthy" : "Disease Detected"}
                </p>
                {!isHealthy && latestDisease && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{latestDisease}</p>
                )}
                {latestScan && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Last scanned {new Date(latestScan.createdAt).toLocaleDateString()} · {Math.round(latestScan.confidence * 100)}% confidence
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3">
              <Activity className="h-5 w-5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">No scans yet — scan this plant to check its health.</p>
            </div>
          )}

          {/* Meta */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {plant.location && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>{plant.location}</span>
              </div>
            )}
            {plant.lastWatered && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Droplets className="h-3.5 w-3.5 text-blue-400" />
                <span>Watered {new Date(plant.lastWatered).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>Added {new Date(plant.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {plant.notes && <p className="mt-3 text-sm text-muted-foreground">{plant.notes}</p>}

          <Button
            size="sm"
            className="mt-4 gap-1.5"
            onClick={() => { sessionStorage.setItem("pending_plant_id", plant.id); router.push("/dashboard") }}
          >
            <Activity className="h-3.5 w-3.5" /> Scan This Plant
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">Care Schedule </TabsTrigger>
          <TabsTrigger value="history">Scan History</TabsTrigger>
        </TabsList>

        {/* Care schedule */}
        <TabsContent value="schedule" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Care Tasks</h3>
            <Button size="sm" variant="outline" className="gap-1.5" asChild>
              <Link href="/dashboard/schedule"><Plus className="h-3.5 w-3.5" /> Add Task</Link>
            </Button>
          </div>
          {schedules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">No care tasks. Add a schedule to stay on top of this plant's needs.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {schedules.map((s, i) => (
                <div key={s.care_schedule_id ?? `schedule-${i}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <button
                    onClick={() => handleComplete(s.care_schedule_id)}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      s.lastCompleted ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"
                    }`}
                  >
                    {s.lastCompleted && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{s.taskType.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.frequency.replace("_", " ")}{s.nextDue ? ` · Due ${new Date(s.nextDue).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteSchedule(s.care_schedule_id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Scan history */}
        <TabsContent value="history" className="mt-4">
          {scanHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">No scans yet for this plant.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {scanHistory.map((s, i) => (
                <div key={s.scanId ?? `scan-${i}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${s.healthy ? "bg-green-500/10" : "bg-destructive/10"}`}>
                    {s.healthy
                      ? <ShieldCheck className="h-4 w-4 text-green-600" />
                      : <AlertTriangle className="h-4 w-4 text-destructive" />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {s.healthy ? "Healthy" : (s.disease ?? "Disease Detected")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleString()} · {Math.round(s.confidence * 100)}% confidence
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}