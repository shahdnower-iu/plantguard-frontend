"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Loader2, Leaf, AlertTriangle, CheckCircle2, Plus,
  Microscope, Zap, ShieldAlert, TrendingUp,
  ChevronRight, ImagePlus, X, Activity,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { usePlants } from "@/context/AppContext"
import { spread, user, type SpreadScanResult } from "@/lib/api"

interface SubscriptionData {
  plan: string; isActive: boolean; weeklyLimit: number
  diseaseScanUsed: number; spreadScanUsed: number
}

// Theme-aware severity/risk using inline styles instead of Tailwind raw colors
function severityStyle(key: string): React.CSSProperties {
  const map: Record<string, { bg: string; color: string }> = {
    mild:     { bg: "rgba(46,158,104,0.1)",  color: "var(--primary)" },
    moderate: { bg: "rgba(245,158,11,0.1)",  color: "#d97706" },
    severe:   { bg: "rgba(249,115,22,0.1)",  color: "#ea580c" },
    critical: { bg: "rgba(220,38,38,0.1)",   color: "var(--destructive)" },
  }
  const cfg = map[key?.toLowerCase()] ?? { bg: "var(--muted)", color: "var(--muted-foreground)" }
  return { background: cfg.bg, color: cfg.color }
}
function riskStyle(label: string): React.CSSProperties {
  const map: Record<string, string> = { "Safe": "var(--primary)", "Monitor": "#d97706", "Act Now": "#ea580c", "Urgent": "var(--destructive)" }
  const color = map[label] ?? "var(--muted-foreground)"
  return { color, background: `${color}18`, border: `1px solid ${color}40` }
}

const STAGE_STEPS = ["early", "developing", "advanced", "terminal"]

function StageTracker({ stage }: { stage?: string }) {
  const current = STAGE_STEPS.indexOf(stage?.toLowerCase() ?? "")
  return (
    <div className="flex items-center gap-1">
      {STAGE_STEPS.map((s, i) => {
        const active = i <= current, isCurrent = i === current
        return (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="h-2 w-full rounded-full transition-colors"
                style={{ background: active ? (isCurrent ? "var(--primary)" : "var(--primary)") : "var(--border)", opacity: active && !isCurrent ? 0.4 : 1 }} />
              <span className="text-[9px] font-bold uppercase tracking-wider capitalize"
                style={{ color: isCurrent ? "var(--foreground)" : "var(--muted-foreground)" }}>{s}</span>
            </div>
            {i < STAGE_STEPS.length - 1 && <ChevronRight size={10} className="text-muted-foreground shrink-0 -mt-3" />}
          </div>
        )
      })}
    </div>
  )
}

function SpreadMeter({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value))
  const color = pct < 25 ? "var(--primary)" : pct < 50 ? "#fbbf24" : pct < 75 ? "#f97316" : "var(--destructive)"
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Spread Coverage</span>
        <span className="text-3xl font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
      </div>
    </div>
  )
}

function ResultsPanel({ result }: { result: SpreadScanResult | null }) {
  return (
    <div className="flex flex-col h-full">
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--secondary)" }}>
              <Microscope className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">No results yet</p>
            <p className="text-xs text-muted-foreground">Upload images and run analysis</p>
          </motion.div>
        ) : !result.valid ? (
          <motion.div key="invalid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 rounded-2xl"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <AlertTriangle size={16} style={{ color: "#d97706" }} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm" style={{ color: "#d97706" }}>Not Analysable</p>
              <p className="text-xs text-muted-foreground mt-1">{result.rejectReason ?? "Images could not be used for spread analysis."}</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {result.riskLabel && (
                <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase" style={riskStyle(result.riskLabel)}>{result.riskLabel}</span>
              )}
              {result.pathogenType && (
                <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase" style={{ background: "var(--muted)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>{result.pathogenType}</span>
              )}
              {result.plantCreated && (
                <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" }}>Auto-Saved</span>
              )}
            </div>

            <div>
              <p className="text-xl font-bold text-foreground">{result.diseaseName ?? "Unknown Disease"}</p>
              {result.affectedAreaEstimate && <p className="text-xs text-muted-foreground mt-0.5">{result.affectedAreaEstimate} affected</p>}
            </div>

            {result.spreadPercentage !== undefined && <SpreadMeter value={result.spreadPercentage} />}

            <div className="grid grid-cols-2 gap-2">
              {result.severity && (
                <div className="p-3 rounded-xl" style={severityStyle(result.severity)}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Severity</p>
                  <p className="font-bold text-sm mt-0.5 capitalize">{result.severity}</p>
                </div>
              )}
              {result.confidence !== undefined && (
                <div className="p-3 rounded-xl" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Confidence</p>
                  <p className="font-bold text-sm mt-0.5 flex items-center gap-1" style={{ color: "#d97706" }}><Zap size={12} /> {result.confidence}%</p>
                </div>
              )}
            </div>

            {result.diseaseStage && (
              <div className="p-3 rounded-xl space-y-2" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Disease Stage</p>
                <StageTracker stage={result.diseaseStage} />
              </div>
            )}

            {(result.spreadRate || result.contagionRisk) && (
              <div className="grid grid-cols-2 gap-2">
                {result.spreadRate && (
                  <div className="p-3 rounded-xl" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Spread Rate</p>
                    <div className="flex items-center gap-1.5 mt-0.5"><TrendingUp size={13} style={{ color: "#f97316" }} /><span className="font-bold text-sm text-foreground capitalize">{result.spreadRate}</span></div>
                  </div>
                )}
                {result.contagionRisk && (
                  <div className="p-3 rounded-xl" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contagion</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <ShieldAlert size={13} style={{ color: result.contagionRisk === "high" ? "var(--destructive)" : result.contagionRisk === "medium" ? "#f59e0b" : "var(--primary)" }} />
                      <span className="font-bold text-sm text-foreground capitalize">{result.contagionRisk}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DetailsPanel({ result }: { result: SpreadScanResult | null }) {
  if (!result?.valid) {
    return (
      <div className="rounded-xl p-5" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-bold text-foreground mb-1">Awaiting Analysis</p>
        <p className="text-xs text-muted-foreground">Upload 1–4 plant images and run spread analysis.</p>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      {result.analysis && (
        <div className="rounded-xl p-4" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5"><Activity size={11} /> Expert Analysis</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{result.analysis}</p>
        </div>
      )}
      {result.recommendations?.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "rgba(var(--primary),0.05)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-bold text-foreground mb-2">Recommendations</p>
          <ul className="space-y-1.5">
            {result.recommendations.map((rec: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--primary)" }} />{rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function SpreadScanPage() {
  const { plants: plantList, plantsLoading, refreshPlants } = usePlants()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [plantMode, setPlantMode] = useState<"existing" | "new">("existing")
  const [selectedPlantId, setSelectedPlantId] = useState("")
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<SpreadScanResult | null>(null)
  const [error, setError] = useState("")

  const isPro = subscription?.plan?.toUpperCase() === "PRO"
  const isLimitReached = !isPro && subscription != null && subscription.spreadScanUsed >= subscription.weeklyLimit

  useEffect(() => {
    user.getSubscription().then(d => setSubscription(d as any)).catch(() => {})
  }, [])

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return
    const merged = [...files, ...Array.from(incoming)].slice(0, 4)
    setFiles(merged)
    setPreviews(prev => { prev.forEach(u => URL.revokeObjectURL(u)); return merged.map(f => URL.createObjectURL(f)) })
  }, [files])

  const removeFile = (idx: number) => {
    const next = files.filter((_, i) => i !== idx)
    URL.revokeObjectURL(previews[idx])
    setFiles(next); setPreviews(next.map(f => URL.createObjectURL(f)))
  }

  const handleScan = async () => {
    if (!files.length) return setError("Select at least one image.")
    setScanning(true); setError(""); setResult(null)
    try {
      const plantId = plantMode === "existing" && selectedPlantId ? selectedPlantId : undefined
      const data = await spread.analyze(files, plantId)
      setResult(data.data)
      if (data.data.plantCreated) await refreshPlants()
      if (subscription) setSubscription(p => p ? { ...p, spreadScanUsed: p.spreadScanUsed + 1 } : null)
    } catch (e: any) { setError(e.message ?? "Analysis failed.") }
    finally { setScanning(false) }
  }

  if (plantsLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="min-h-screen bg-background pb-12 text-foreground">
      <div className="max-w-4xl mx-auto px-4 pt-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: "var(--primary)" }}>
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Spread Scan Analysis</h1>
        </div>

        {/* Limit + Plant Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="flex items-center gap-4 rounded-3xl p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="w-16 h-16 rounded-full border-4 flex items-center justify-center flex-shrink-0" style={{ borderColor: "var(--primary)" }}>
              <span className="text-4xl font-bold text-primary">{isPro ? "∞" : Math.max(0, (subscription?.weeklyLimit ?? 10) - (subscription?.spreadScanUsed ?? 0))}</span>
            </div>
            <div>
              <p className="font-bold text-foreground">Remaining Scans</p>
              <p className="text-sm text-muted-foreground">{isPro ? "Premium Plan Active" : "Weekly limit resets soon"}</p>
            </div>
          </div>

          <div className="rounded-3xl p-6 space-y-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            {[
              { mode: "existing" as const, icon: <Leaf />, title: "Existing Plant", sub: "Link to your garden" },
              { mode: "new" as const, icon: <Plus />, title: "New Discovery", sub: "Auto-create plant" },
            ].map(({ mode, icon, title, sub }) => (
              <button key={mode} onClick={() => setPlantMode(mode)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all"
                style={{
                  border: `1px solid ${plantMode === mode ? "var(--primary)" : "var(--border)"}`,
                  background: plantMode === mode ? "var(--muted)" : "transparent",
                }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: "var(--primary)" }}>{icon}</div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">{title}</p>
                  <p className="text-sm text-muted-foreground">{sub}</p>
                </div>
              </button>
            ))}
            {plantMode === "existing" && (
              <div>
                <p className="uppercase text-xs font-bold tracking-widest text-muted-foreground mb-2">Target Specimen</p>
                <select value={selectedPlantId} onChange={e => setSelectedPlantId(e.target.value)}
                  className="w-full rounded-2xl px-5 py-4 appearance-none"
                  style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
                  <option value="">Select from Garden...</option>
                  {plantList.map(p => <option key={p.plant_id} value={p.plant_id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Multi-Image Scanner */}
        <div className="rounded-3xl p-8 mb-6 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-5" style={{ background: "var(--primary)" }}>
            <ImagePlus className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Multi-Image Scanner</h2>
          <p className="text-muted-foreground mb-6">Drop or tap to add up to 4 plant photos</p>
          {previews.length > 0 && (
            <div className={`grid gap-3 ${previews.length === 1 ? "grid-cols-1" : "grid-cols-2"} mb-6`}>
              {previews.map((src, i) => (
                <div key={i} className="relative rounded-2xl overflow-hidden aspect-video" style={{ background: "var(--muted)" }}>
                  <img src={src} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                  <button onClick={() => removeFile(i)} className="absolute top-2 right-2 bg-black/70 p-1 rounded-full text-white"><X size={16} /></button>
                </div>
              ))}
            </div>
          )}
          <label className="block cursor-pointer">
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
            <div className="border-2 border-dashed rounded-2xl py-8 transition-colors hover:border-primary" style={{ borderColor: "var(--border)" }}>
              <ImagePlus className="mx-auto text-muted-foreground" size={36} />
            </div>
          </label>
        </div>

        {error && <p className="text-center text-sm font-semibold mb-4" style={{ color: "var(--destructive)" }}>{error}</p>}

        {/* Scan Button */}
        <button onClick={handleScan} disabled={!files.length || scanning || !!isLimitReached}
          className="w-full h-14 font-semibold rounded-2xl flex items-center justify-center gap-3 mb-8 text-lg text-white transition-opacity disabled:opacity-50"
          style={{ background: "var(--primary)" }}>
          {scanning ? <Loader2 className="animate-spin" /> : <Microscope />}
          {scanning ? "Analyzing…" : isLimitReached ? "Limit Exceeded" : "Run Spread Analysis"}
        </button>
        {isPro && <p className="text-center text-sm font-bold text-primary tracking-widest mb-8">UNLIMITED SCANS ACTIVE</p>}

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <h3 className="font-bold text-lg text-foreground mb-4">Analysis</h3>
            <ResultsPanel result={result} />
          </div>
          <div className="rounded-3xl p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">🌿 Spread Details</h3>
            <DetailsPanel result={result} />
          </div>
        </div>
      </div>
    </div>
  )
}
