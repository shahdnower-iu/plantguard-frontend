"use client"

import { useState, useRef } from "react"
import { Upload, Camera, X, Sparkles, ImageIcon, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { detect, spread } from "@/lib/api"

type ScanMode = "single" | "spread"

export function DetectionUpload() {
  const router = useRouter()
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<{ url: string; file: File; name: string; size: string }[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<ScanMode>("single")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (files: FileList) => {
    const arr = Array.from(files).slice(0, mode === "spread" ? 4 : 1)
    const mapped = arr.map(file => ({
      file,
      name: file.name,
      size: (file.size / 1024).toFixed(0) + " KB",
      url: URL.createObjectURL(file),
    }))
    setSelectedFiles(mode === "spread" ? [...selectedFiles, ...mapped].slice(0, 4) : mapped)
    setError(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false)
    if (e.dataTransfer.files) handleFile(e.dataTransfer.files)
  }

  const clearFile = (idx: number) => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))

  const handleAnalyze = async () => {
    if (!selectedFiles.length) return
    setIsAnalyzing(true); setError(null)
    try {
      if (mode === "single") {
        const result = await detect.predict(selectedFiles[0].file)
        sessionStorage.setItem("scan_result", JSON.stringify(result.data))
        router.push("/dashboard/detection-result")
      } else {
        const result = await spread.analyze(selectedFiles.map(f => f.file))
        sessionStorage.setItem("scan_result", JSON.stringify(result.data))
        router.push("/dashboard/detection-result")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border bg-primary/5 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Camera className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">Detect Health Status</h2>
          <p className="text-xs text-muted-foreground">Upload a plant photo for instant AI analysis</p>
        </div>
        {/* Mode toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          <button onClick={() => { setMode("single"); setSelectedFiles([]) }}
            className={`px-3 py-1.5 transition-colors ${mode === "single" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
            Single
          </button>
          <button onClick={() => { setMode("spread"); setSelectedFiles([]) }}
            className={`px-3 py-1.5 flex items-center gap-1 transition-colors ${mode === "spread" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
            <Layers className="h-3 w-3" /> Spread
          </button>
        </div>
      </div>

      <div className="p-5">
        {selectedFiles.length > 0 ? (
          <div className="space-y-3">
            <div className={`grid gap-2 ${selectedFiles.length > 1 ? "grid-cols-2" : ""}`}>
              {selectedFiles.map((f, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden border border-border">
                  <Image src={f.url} alt={f.name} width={400} height={200} className="w-full h-36 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <button onClick={() => clearFile(i)}
                    className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70">
                    <X className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-1.5 left-2 text-xs text-white/80 flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    <span className="truncate max-w-[100px]">{f.name}</span>
                  </div>
                </div>
              ))}
              {mode === "spread" && selectedFiles.length < 4 && (
                <button onClick={() => fileInputRef.current?.click()}
                  className="h-36 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:bg-accent/50 transition-all">
                  <div className="text-center">
                    <Upload className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-xs">Add photo</span>
                  </div>
                </button>
              )}
            </div>

            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setSelectedFiles([])}>
                Clear All
              </Button>
              <Button size="sm" className="flex-1 gap-1.5 text-xs" onClick={handleAnalyze} disabled={isAnalyzing}>
                <Sparkles className="h-3.5 w-3.5" />
                {isAnalyzing ? "Analyzing..." : "Analyze Plant"}
              </Button>
            </div>
          </div>
        ) : (
          <div onDragEnter={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false) }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200 ${
              dragActive ? "border-primary bg-primary/5 scale-[0.99]" : "border-border hover:border-primary/50 hover:bg-accent/50"
            }`}>
            <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${dragActive ? "bg-primary/15" : "bg-muted"}`}>
              <Upload className={`h-5 w-5 transition-colors ${dragActive ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <p className="text-sm font-medium text-foreground">
              {dragActive ? "Drop your photo here" : "Drag & drop or click to upload"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "spread" ? "Upload 1–4 photos for spread analysis" : "JPG, PNG or WEBP · Max 10 MB"}
            </p>
            <input ref={fileInputRef} type="file" accept="image/*" multiple={mode === "spread"} className="hidden" onChange={(e) => { if (e.target.files) handleFile(e.target.files) }} />
          </div>
        )}
      </div>
    </div>
  )
}
