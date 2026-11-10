"use client"

// app/(dashboard)/plants/page.tsx

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Plus, Droplets, Leaf, Search, X, Camera, Edit2, Filter, ScanLine, Microscope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { plants as plantsApi } from "@/lib/api"
import { usePlants } from "@/context/AppContext"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  return `${days} days ago`
}

function healthBadgeClass(status: string) {
  switch (status) {
    case "EXCELLENT": return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
    case "GOOD":      return "bg-green-100 text-green-700 hover:bg-green-100"
    case "FAIR":      return "bg-amber-100 text-amber-700 hover:bg-amber-100"
    case "POOR":      return "bg-red-50 text-red-700 hover:bg-red-100"
    default:          return "bg-stone-100 text-stone-600"
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyPlantsPage() {
  // ✅ Read from global context — already fetched, no spinner on navigation
  const { plants, plantsLoading, refreshPlants } = usePlants()

  const [searchQuery, setSearchQuery]   = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  const [showAdd, setShowAdd]           = useState(false)
  const [editingPlant, setEditingPlant] = useState<any>(null)
  const [processing, setProcessing]     = useState(false)
  const [imageFile, setImageFile]       = useState<File | null>(null)
  const [form, setForm] = useState({ name: "", plantType: "", location: "", notes: "" })

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filteredPlants = useMemo(() => {
    return plants.filter(plant => {
      const matchesSearch = plant.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "ALL" || (plant as any).healthStatus === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [plants, searchQuery, statusFilter])

  // ── Add ─────────────────────────────────────────────────────────────────────
  const handleAddPlant = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    try {
      const fd = new FormData()
      fd.append("name", form.name)
      fd.append("plantType", form.plantType)
      if (form.location) fd.append("location", form.location)
      if (form.notes)    fd.append("notes", form.notes)
      if (imageFile)     fd.append("image", imageFile)

      await plantsApi.create(fd)
      await refreshPlants()
      setShowAdd(false)
      resetForm()
    } catch {
      alert("Failed to add plant")
    } finally {
      setProcessing(false)
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  const handleUpdatePlant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlant) return
    setProcessing(true)
    try {
      const fd = new FormData()
      fd.append("name", form.name)
      fd.append("plantType", form.plantType)
      fd.append("location", form.location)
      fd.append("notes", form.notes)
      if (imageFile) fd.append("image", imageFile)

      await plantsApi.update(editingPlant.plant_id ?? editingPlant.id, fd)
      await refreshPlants()
      setEditingPlant(null)
      resetForm()
    } catch {
      alert("Failed to update plant")
    } finally {
      setProcessing(false)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm("Delete this plant?")) return
    try {
      await plantsApi.delete(id)
      await refreshPlants()
    } catch {
      alert("Could not delete plant")
    }
  }

  const resetForm = () => { setForm({ name: "", plantType: "", location: "", notes: "" }); setImageFile(null) }

  const openEdit = (plant: any) => {
    setEditingPlant(plant)
    setForm({
      name:      plant.name,
      plantType: plant.plantType,
      location:  plant.location ?? "",
      notes:     plant.notes ?? "",
    })
  }

  // ── Skeleton (first load only, from context) ────────────────────────────────
  if (plantsLoading) {
    return (
      <div className="flex flex-col gap-8 p-6 max-w-7xl mx-auto">
        <div className="h-10 w-48 bg-muted animate-pulse rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8 p-6 max-w-7xl mx-auto bg-[#FBFBF9] min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1A2E1A]">My Plants</h1>
          <p className="text-sm text-stone-500 font-medium">{plants.length} active plants under monitoring</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Search by name..."
              className="pl-9 w-[180px] bg-white border-stone-200 focus:ring-emerald-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-md px-3 h-10">
            <Filter size={14} className="text-stone-400" />
            <select
              className="bg-transparent text-sm focus:outline-none cursor-pointer font-medium text-stone-600"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
            </select>
          </div>

          {/* Add plant dialog */}
          <Dialog open={showAdd} onOpenChange={(val) => { setShowAdd(val); if (!val) resetForm() }}>
            <DialogTrigger asChild>
              <Button className="bg-[#1A2E1A] hover:bg-[#2A452A] text-white gap-2 rounded-xl shadow-sm">
                <Plus size={18} /> Add Plant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add New Plant</DialogTitle></DialogHeader>
              <form onSubmit={handleAddPlant} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Input required value={form.plantType} onChange={e => setForm({ ...form, plantType: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Location (Optional)</Label>
                  <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Care Notes (Optional)</Label>
                  <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Photo (Optional)</Label>
                  <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                </div>
                <Button type="submit" className="w-full bg-[#1A2E1A]" disabled={processing}>
                  {processing ? "Saving..." : "Add to Collection"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Empty state */}
      {filteredPlants.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <Leaf className="h-12 w-12 text-stone-300" />
          <p className="text-stone-500 font-medium">
            {plants.length === 0 ? "No plants yet — add your first one!" : "No plants match your search."}
          </p>
        </div>
      )}

      {/* Plant cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPlants.map((plant: any, i: number) => {
          const pid = plant.plant_id ?? plant.id ?? `plant-fallback-${i}`
          return (
            <div
              key={pid}
              className="group flex flex-col sm:flex-row bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden hover:shadow-md transition-all"
            >
              {/* Image */}
              <div className="relative w-full sm:w-48 h-48 sm:h-auto bg-stone-100">
                <Image
                  src={plant.imageUrl || "/placeholder-plant.jpg"}
                  alt={plant.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-white/90 backdrop-blur shadow-sm rounded-lg"
                    onClick={() => openEdit(plant)}
                  >
                    <Edit2 size={14} className="text-stone-700" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8 shadow-sm rounded-lg"
                    onClick={(e) => handleDelete(e, plant.plant_id ?? plant.id)}
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 p-5 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-[#1A2E1A]">{plant.name}</h3>
                    <p className="text-xs italic text-stone-500 font-medium">{plant.scientificName || plant.plantType}</p>
                  </div>
                  <Badge className={healthBadgeClass(plant.healthStatus)}>
                    {plant.healthStatus ?? "PENDING"}
                  </Badge>
                </div>

                <div className="flex gap-4 my-4">
                  <div className="flex-1 bg-stone-50 rounded-xl p-3 text-center border border-stone-100">
                    <Droplets className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
                    <p className="text-[10px] uppercase text-stone-400 font-bold">Last Watered</p>
                    <p className="text-xs font-semibold text-stone-700">{timeAgo(plant.lastWatered)}</p>
                  </div>
                  <div className="flex-1 bg-stone-50 rounded-xl p-3 text-center border border-stone-100">
                    <Leaf className="h-4 w-4 mx-auto mb-1 text-stone-600" />
                    <p className="text-[10px] uppercase text-stone-400 font-bold">Last Fertilized</p>
                    <p className="text-xs font-semibold text-stone-700">{timeAgo(plant.lastFertilized)}</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-auto">
                  <Link href={`/dashboard/plant-detail?id=${plant.plant_id ?? plant.id}`} className="flex-1">
                    <Button variant="outline" className="w-full rounded-xl border-stone-200 text-stone-600 font-semibold hover:bg-stone-50">
                      Details
                    </Button>
                  </Link>
                  <Link href={`/dashboard/scan?plantId=${plant.plant_id ?? plant.id}`}>
                    <Button
                      size="icon"
                      className="bg-emerald-600 hover:bg-emerald-700 rounded-xl shrink-0 shadow-lg shadow-emerald-900/10"
                      title="Disease Scan"
                    >
                      <Camera className="h-4 w-4 text-white" />
                    </Button>
                  </Link>
                  <Link href={`/dashboard/spread-scan?plantId=${plant.plant_id ?? plant.id}`}>
                    <Button
                      size="icon"
                      className="bg-[#1A2E1A] hover:bg-[#2A452A] rounded-xl shrink-0 shadow-lg shadow-emerald-900/10"
                      title="Spread Scan"
                    >
                      <ScanLine className="h-4 w-4 text-white" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingPlant} onOpenChange={(val) => { if (!val) setEditingPlant(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Update Plant Details</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdatePlant} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Input required value={form.plantType} onChange={e => setForm({ ...form, plantType: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Update Photo (Optional)</Label>
              <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
            </div>
            <Button type="submit" className="w-full bg-[#1A2E1A]" disabled={processing}>
              {processing ? "Updating..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
