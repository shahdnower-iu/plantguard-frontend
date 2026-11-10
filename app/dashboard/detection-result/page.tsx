"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, AlertTriangle, CheckCircle2, TrendingUp, Lock, Crown, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import type { ScanResult, SpreadResult } from "@/lib/api"

export default function DetectionResultPage() {
  const [result, setResult] = useState<ScanResult & SpreadResult | null>(null)
  const [showPro, setShowPro] = useState(false)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("scan_result")
      if (stored) setResult(JSON.parse(stored))
    } catch {}
  }, [])

  if (!result) return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground">No scan result found</h2>
        <p className="text-sm text-muted-foreground mt-1">Upload a plant photo to see detection results.</p>
        <Button className="mt-4" asChild><Link href="/dashboard">Scan a Plant</Link></Button>
      </div>
    </div>
  )

  const isHealthy = result.isHealthy
  const healthScore = result.healthScore ?? (isHealthy ? 85 : 35)

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row">
        {result.imageUrl && (
          <div className="relative h-72 w-full overflow-hidden rounded-xl lg:h-auto lg:w-80">
            <Image src={result.imageUrl} alt="Scanned plant" fill className="object-cover" />
          </div>
        )}

        <div className="flex-1 flex flex-col gap-4">
          {/* Status */}
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isHealthy ? "bg-green-500/10" : "bg-destructive/10"}`}>
              {isHealthy
                ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                : <AlertTriangle className="h-5 w-5 text-destructive" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{isHealthy ? "Plant is Healthy!" : "Disease Detected"}</h1>
              <p className="text-sm text-muted-foreground">Scan completed at {new Date().toLocaleTimeString()}</p>
            </div>
          </div>

          {/* Main result */}
          <div className="rounded-xl border border-border p-5">
            <h2 className="text-lg font-semibold text-foreground">
              {isHealthy ? "No Disease Found" : (result.disease ?? "Unknown Disease")}
            </h2>
            {result.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.description}</p>
            )}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Detection Confidence</span>
                <span className="font-semibold text-foreground">{result.confidence ?? 0}%</span>
              </div>
              <Progress value={result.confidence ?? 0} className="mt-2" />
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Health Score</span>
                <span className={`font-semibold ${healthScore >= 70 ? "text-green-600" : healthScore >= 40 ? "text-amber-500" : "text-destructive"}`}>
                  {healthScore}/100
                </span>
              </div>
              <Progress value={healthScore} className="mt-2" />
            </div>
          </div>

          {/* Pro: Spread Analysis */}
          {!isHealthy && (
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-accent/30 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold text-foreground">Disease Severity Analysis</h3>
                <Badge variant="secondary" className="text-xs">PRO</Badge>
              </div>

              {showPro && result.affectedArea !== undefined ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Affected Area</span>
                      <span className="font-bold text-destructive">{result.affectedArea?.toFixed(1) ?? "—"}%</span>
                    </div>
                    <Progress value={result.affectedArea ?? 0} className="mt-1" />
                  </div>
                  {result.healthyTissue !== undefined && (
                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Healthy Tissue</span>
                        <span className="font-bold text-green-600">{result.healthyTissue?.toFixed(1) ?? "—"}%</span>
                      </div>
                      <Progress value={result.healthyTissue ?? 0} className="mt-1" />
                    </div>
                  )}
                  {result.spreadRisk && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Spread Risk:</span>
                      <Badge variant={result.spreadRisk === "HIGH" ? "destructive" : result.spreadRisk === "MEDIUM" ? "secondary" : "outline"}>
                        {result.spreadRisk}
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    Recovery possible with proper treatment within 2–4 weeks.
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-3">
                    <Lock className="h-4 w-4" />
                    Unlock detailed severity analysis with PRO
                  </div>
                  <Button onClick={() => setShowPro(true)} size="sm" className="gap-2" asChild>
                    <Link href="/dashboard/upgrade"><Crown className="h-4 w-4" /> Unlock Pro Analysis</Link>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Treatment */}
          {result.treatment && result.treatment.length > 0 && (
            <div className="rounded-xl border border-border p-5">
              <h3 className="font-semibold text-foreground">Recommended Treatment</h3>
              <div className="mt-3 flex flex-col gap-3">
                {result.treatment.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{i + 1}</div>
                    <p className="text-sm text-muted-foreground">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {result.plantId && (
              <Button asChild>
                <Link href={`/dashboard/plant-detail?id=${result.plantId}`}>View Plant Details</Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/dashboard">Scan Another Plant</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
