
"use client"

import React, { useState, useRef, useEffect } from "react"
import {
  Loader2, Camera, Leaf, AlertTriangle, CheckCircle2, XCircle,
  Plus, ScanLine, Microscope, X, Clock, Sparkles, ImagePlus,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { usePlants } from "@/context/AppContext"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface DiseaseAdvice {
  disease_overview: string; cause: string;
  treatment: string[]; prevention: string[];
  urgency: "low" | "medium" | "high" | "critical"
}
interface ScanResult {
  scanId: string; plantId: string; plantCreated: boolean; imageUrl: string
  healthy: boolean; disease: string | null; diagnosis: string
  confidence: number; pathogenType: string; inferenceMs: number; advice: DiseaseAdvice | null
}
interface SubscriptionData {
  plan: string; isActive: boolean; weeklyLimit: number
  diseaseScanUsed: number; spreadScanUsed: number
}

// ----------------------------------------------------------------------------
// Small presentational helpers
// ----------------------------------------------------------------------------

const URGENCY_STYLES: Record<DiseaseAdvice["urgency"], { label: string; dot: string; text: string; bg: string; border: string }> = {
  low: { label: "Low priority", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  medium: { label: "Monitor closely", dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  high: { label: "Act soon", dot: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  critical: { label: "Urgent", dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
}

function UrgencyBadge({ urgency }: { urgency: DiseaseAdvice["urgency"] }) {
  const s = URGENCY_STYLES[urgency]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function ConfidenceMeter({ value, tone }: { value: number; tone: "healthy" | "diseased" }) {
  const pct = Math.round(value * 100)
  const barColor = tone === "healthy" ? "bg-emerald-500" : "bg-red-500"
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-mono uppercase tracking-wider text-muted-foreground">Confidence</span>
        <span className="font-mono font-semibold text-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}

function StepLabel({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-muted-foreground mb-3">
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-mono">{index}</span>
      <span className="uppercase">{children}</span>
    </p>
  )
}

function UsageMeter({ used, limit, isPro }: { used: number; limit: number; isPro: boolean }) {
  const remaining = Math.max(0, limit - used)
  const pct = isPro ? 1 : limit > 0 ? Math.min(1, used / limit) : 0
  const r = 50, circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  const color = isPro ? "var(--primary)" : pct >= 1 ? "var(--destructive)" : pct >= 0.75 ? "#f59e0b" : "var(--primary)"

  return (
    <div className="flex items-center gap-5 w-full">
      <div className="relative w-[104px] h-[104px] flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="9" />
          <motion.circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="9"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground leading-none">{isPro ? "∞" : remaining}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">left</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-1">Disease Scans</p>
        <p className="text-xl font-bold text-foreground leading-tight" style={{ fontFamily: "'Cormorant Garamond',serif" }}>
          {isPro ? "Unlimited on Pro" : `${used} of ${limit} used`}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">{isPro ? "Premium plan active" : "Resets weekly"}</p>
      </div>
    </div>
  )
}

function ModeOption({ active, onClick, icon, title, subtitle }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string; subtitle: string
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`relative p-5 rounded-2xl flex gap-4 border text-left transition-all ${active ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card hover:border-primary/40"}`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${active ? "bg-green-600" : "bg-muted"}`}>
        <span className={active ? "text-white" : "text-muted-foreground"}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="font-semibold leading-tight">{title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      {active && (
        <CheckCircle2 className="w-4 h-4 text-primary absolute top-3 right-3" />
      )}
    </button>
  )
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3"
    >
      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-700 flex-1">{message}</p>
      <button onClick={onDismiss} aria-label="Dismiss error" className="text-red-500 hover:text-red-700">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

// ----------------------------------------------------------------------------
// Scanner dropzone — upload, drag & drop, viewfinder framing, scan animation
// ----------------------------------------------------------------------------

function ScannerDropzone({
  preview, isScanning, onFile, onClear,
}: {
  preview: string | null; isScanning: boolean
  onFile: (f: File) => void; onClear: () => void
}) {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault(); setIsDragging(false)
        const f = e.dataTransfer.files?.[0]
        if (f && f.type.startsWith("image/")) onFile(f)
      }}
      className={`group relative aspect-video max-h-[420px] rounded-[28px] overflow-hidden border-2 border-dashed transition-colors ${
        isDragging ? "border-primary bg-primary/5" : "border-border bg-secondary"
      }`}
    >
      {/* viewfinder corner brackets */}
      <div className="absolute inset-4 pointer-events-none z-10">
        {[
          "top-0 left-0 border-t-2 border-l-2 rounded-tl-lg",
          "top-0 right-0 border-t-2 border-r-2 rounded-tr-lg",
          "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg",
          "bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg",
        ].map((pos, i) => (
          <span key={i} className={`absolute w-7 h-7 border-primary/40 ${pos}`} />
        ))}
      </div>

      {preview ? (
        <img src={preview} className="w-full h-full object-cover" alt="Selected plant photo" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-green-600 flex items-center justify-center">
            <ScanLine className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Drop a plant photo here</h2>
            <p className="text-muted-foreground text-sm mt-1">or click to browse — clear, well-lit shots work best</p>
          </div>
        </div>
      )}

      {/* scanning overlay */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/55 flex items-center justify-center z-20"
          >
            <motion.div
              className="absolute left-0 right-0 h-16"
              style={{ background: "linear-gradient(180deg, transparent, rgba(74,222,128,0.45), transparent)" }}
              initial={{ top: "-10%" }}
              animate={{ top: "110%" }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
            />
            <div className="flex items-center gap-2 text-white font-mono text-sm tracking-wide">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing tissue samples…
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {preview && !isScanning && (
        <button
          onClick={(e) => { e.stopPropagation(); onClear() }}
          aria-label="Remove photo"
          className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black/75 text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <input
        type="file"
        accept="image/*"
        disabled={isScanning}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
        aria-label="Upload plant photo"
        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
        style={{ zIndex: 5 }}
      />
    </div>
  )
}

// ----------------------------------------------------------------------------
// Diagnosis (results) panel
// ----------------------------------------------------------------------------

function DiagnosisPanel({ scanResult, preview }: { scanResult: ScanResult | null; preview: string | null }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-xl" style={{ fontFamily: "'Cormorant Garamond',serif" }}>Diagnosis</h3>
        {scanResult && <UrgencyBadge urgency={scanResult.advice?.urgency ?? "low"} />}
      </div>

      <AnimatePresence mode="wait">
        {!scanResult ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-3 py-8">
            <Microscope className="w-8 h-8 opacity-40" />
            <p className="text-sm max-w-[220px]">Run a scan to see the diagnosis here</p>
          </div>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex gap-4">
              <img src={scanResult.imageUrl || preview || ""} alt="Scanned plant" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {scanResult.healthy ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
                  <p className="font-bold leading-tight truncate">{scanResult.disease || "Healthy"}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{scanResult.diagnosis}</p>
              </div>
            </div>

            <ConfidenceMeter value={scanResult.confidence} tone={scanResult.healthy ? "healthy" : "diseased"} />

            <div className="flex items-center gap-4 pt-3 border-t text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Microscope className="w-3.5 h-3.5" />
                {scanResult.pathogenType || "n/a"}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {(scanResult.inferenceMs / 1000).toFixed(2)}s
              </span>
            </div>

            {scanResult.plantCreated && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                <Sparkles className="w-3.5 h-3.5" />
                Added as a new plant in your garden
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Care advice panel
// ----------------------------------------------------------------------------

function AdvicePanel({ advice, healthy }: { advice: DiseaseAdvice | null; healthy: boolean }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Leaf className="w-5 h-5 text-emerald-600" />
        <h3 className="font-bold text-xl" style={{ fontFamily: "'Cormorant Garamond',serif" }}>Care Advice</h3>
        {advice && <span className="text-xs px-3 py-1 rounded-full bg-violet-100 text-violet-700 font-semibold">AI Pathologist</span>}
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        {!advice ? (
          <div className="rounded-2xl p-5 bg-muted/50 border">
            <p className="text-sm font-semibold mb-2">{healthy ? "General care" : "Diagnosis mode"}</p>
            <p className="text-sm text-muted-foreground">
              {healthy ? "Your specimen appears healthy. Maintain consistent moisture and light." : "Scan your plant to receive tailored AI advice."}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl p-5 bg-muted/50 border">
              <p className="font-semibold mb-1">Condition overview</p>
              <p className="text-sm text-muted-foreground">{advice.disease_overview}</p>
            </div>
            <div className="rounded-2xl p-5 bg-muted/50 border">
              <p className="font-semibold mb-1">Cause</p>
              <p className="text-sm text-muted-foreground">{advice.cause}</p>
            </div>
            <div className="rounded-2xl p-5 border bg-emerald-50/50">
              <p className="font-semibold mb-3">Treatment</p>
              <ul className="space-y-2 text-sm">
                {advice.treatment.map((t, i) => (
                  <li key={i} className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />{t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl p-5 border bg-emerald-50/50">
              <p className="font-semibold mb-3">Prevention</p>
              <ul className="space-y-2 text-sm">
                {advice.prevention.map((p, i) => (
                  <li key={i} className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />{p}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------

export default function ScanPage() {
  const { plants, plantsLoading, refreshPlants } = usePlants()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [plantMode, setPlantMode] = useState<"existing" | "new">("existing")
  const [selectedPlantId, setSelectedPlantId] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState("")
  const resultRef = useRef<HTMLDivElement>(null)

  const isPro = subscription?.plan?.toUpperCase() === "PRO"
  const isLimitReached = !isPro && !!subscription && subscription.diseaseScanUsed >= subscription.weeklyLimit

  useEffect(() => {
    fetch(`${API_BASE}/api/user/subscription`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
    }).then(r => r.ok ? r.json() : null).then(d => d && setSubscription(d)).catch(() => {})
  }, [])

  const handleFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setScanResult(null)
    setError("")
  }

  const handleClear = () => {
    setFile(null)
    setPreview(null)
    setScanResult(null)
  }

  const handleScan = async () => {
    if (!file) return setError("Select an image first.")
    setIsScanning(true); setError("")
    try {
      const formData = new FormData()
      formData.append("image", file)
      if (plantMode === "existing" && selectedPlantId) formData.append("plantId", selectedPlantId)

      const res = await fetch(`${API_BASE}/api/detect/predict`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Scan failed")

      const data = json.data || json
      setScanResult(data)
      if (data.plantCreated) await refreshPlants()
      if (subscription) setSubscription(p => p ? { ...p, diseaseScanUsed: p.diseaseScanUsed + 1 } : null)
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsScanning(false)
    }
  }

  if (plantsLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <header className="mb-10 flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-primary uppercase mb-2">PlantGuard AI </p>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cormorant Garamond',serif" }}>
              Disease Detection
            </h1>
            <p className="text-muted-foreground mt-1">Real-time pathology, powered by AI.</p>
          </div>
        </header>

        <main className="space-y-8">
          {/* Step 1 — usage + specimen selection */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 p-6 rounded-3xl bg-card border flex items-center">
              <UsageMeter used={subscription?.diseaseScanUsed ?? 0} limit={subscription?.weeklyLimit ?? 15} isPro={isPro} />
            </div>

            <div className="lg:col-span-7">
              <StepLabel index="01">Choose your specimen</StepLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ModeOption
                  active={plantMode === "existing"}
                  onClick={() => setPlantMode("existing")}
                  icon={<Leaf className="w-5 h-5" />}
                  title="Existing plant"
                  subtitle="Link this scan to your garden"
                />
                <ModeOption
                  active={plantMode === "new"}
                  onClick={() => setPlantMode("new")}
                  icon={<Plus className="w-5 h-5" />}
                  title="New discovery"
                  subtitle="Auto-create a plant entry"
                />
              </div>

              {plantMode === "existing" && (
                <div className="mt-4 p-5 rounded-2xl bg-card border">
                  {plants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Your garden is empty. Switch to <span className="font-semibold">New discovery</span> to scan and add your first plant automatically.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3">Target specimen</p>
                      <select value={selectedPlantId} onChange={e => setSelectedPlantId(e.target.value)}
                        className="w-full px-5 py-3.5 rounded-xl bg-muted border border-border">
                        <option value="">Select from garden…</option>
                        {plants.map(p => <option key={p.plant_id} value={p.plant_id}>{p.name}</option>)}
                      </select>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Step 2 — capture */}
          <div className="rounded-3xl bg-card border p-8 flex flex-col gap-6">
            <StepLabel index="02">Capture the leaf</StepLabel>

            <ScannerDropzone preview={preview} isScanning={isScanning} onFile={handleFile} onClear={handleClear} />

            <AnimatePresence>
              {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}
            </AnimatePresence>

            <button
              onClick={handleScan}
              disabled={!file || isScanning || isLimitReached}
              className="w-full h-16 rounded-2xl font-semibold text-lg bg-primary text-white disabled:opacity-50 flex items-center justify-center gap-3 transition-opacity"
            >
              {isScanning ? <Loader2 className="animate-spin w-5 h-5" /> : file ? <ScanLine className="w-5 h-5" /> : <ImagePlus className="w-5 h-5" />}
              {isLimitReached ? "Weekly limit reached" : isScanning ? "Scanning…" : "Run AI scan"}
            </button>
          </div>

          {/* Step 3 — results */}
          <div ref={resultRef}>
            <StepLabel index="03">Review the results</StepLabel>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 p-6 rounded-3xl bg-card border min-h-[260px]">
                <DiagnosisPanel scanResult={scanResult} preview={preview} />
              </div>
              <div className="lg:col-span-3 p-6 rounded-3xl bg-card border min-h-[260px]">
                <AdvicePanel advice={scanResult?.advice || null} healthy={scanResult?.healthy ?? false} />
              </div>
            </div>
          </div>

          {!isPro && isLimitReached && (
            <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200 text-center">
              <AlertTriangle className="w-8 h-8 mx-auto text-amber-600 mb-3" />
              <p className="font-semibold">Upgrade to Pro for unlimited scans</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}