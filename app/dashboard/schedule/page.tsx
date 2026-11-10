
"use client"
import { useState, useEffect, useCallback } from "react"
import {
  Calendar, Plus, CheckCircle2, Sprout, LayoutGrid,
  Trash2, Droplets, Leaf, Scissors, RefreshCw, Activity, AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { plants as plantsApi, type Plant, type CareSchedule } from "@/lib/api"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────
type ScheduleWithPlant = CareSchedule & { plantName: string; plantId: string }

// ─── Constants ────────────────────────────────────────────────────────────────
const TASK_META: Record<string, { label: string; icon: React.ReactNode; bg: string; color: string }> = {
  WATER:        { label: "Water",        icon: <Droplets className="h-4 w-4" />, bg: "bg-blue-50",    color: "text-blue-500"    },
  FERTILIZE:    { label: "Fertilize",    icon: <Leaf     className="h-4 w-4" />, bg: "bg-yellow-50",  color: "text-yellow-600"  },
  PRUNE:        { label: "Prune",        icon: <Scissors className="h-4 w-4" />, bg: "bg-purple-50",  color: "text-purple-500"  },
  REPOT:        { label: "Repot",        icon: <RefreshCw className="h-4 w-4" />, bg: "bg-orange-50", color: "text-orange-500"  },
  CHECK_HEALTH: { label: "Check Health", icon: <Activity className="h-4 w-4" />, bg: "bg-emerald-50", color: "text-emerald-600" },
}
const TASK_TYPES  = ["WATER", "FERTILIZE", "PRUNE", "REPOT", "CHECK_HEALTH"] as const
const FREQUENCIES = ["DAILY", "TWICE_WEEKLY", "WEEKLY", "BIWEEKLY", "MONTHLY", "AS_NEEDED"] as const

const fmtFrequency = (f: string) =>
  ({ DAILY: "Daily", TWICE_WEEKLY: "Twice a week", WEEKLY: "Weekly",
     BIWEEKLY: "Every 2 weeks", MONTHLY: "Monthly", AS_NEEDED: "As needed" }[f] ?? f)

const FREQ_DAYS: Record<string, number> = {
  DAILY: 1, TWICE_WEEKLY: 3, WEEKLY: 7, BIWEEKLY: 14, MONTHLY: 30,
}

const getDayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

function occurrencesInRange(
  schedule: ScheduleWithPlant,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  if (!schedule.nextDue) return []
  const step = FREQ_DAYS[schedule.frequency]
  if (!step) return []
  const results: Date[] = []
  const cursor = new Date(schedule.nextDue)
  while (cursor > rangeEnd) cursor.setDate(cursor.getDate() - step)
  while (cursor <= rangeEnd) {
    if (cursor >= rangeStart) results.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + step)
  }
  return results
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SchedulePage() {
  const [schedules,    setSchedules]    = useState<ScheduleWithPlant[]>([])
  const [plantList,    setPlantList]    = useState<Plant[]>([])
  const [loading,      setLoading]      = useState(true)
  const [activeTab,    setActiveTab]    = useState<"overview" | "thisweek">("overview")
  const [showAdd,      setShowAdd]      = useState(false)
  const [deleting,     setDeleting]     = useState<string | null>(null)
  const [completing,   setCompleting]   = useState<string | null>(null)
  const [adding,       setAdding]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())

  const [addForm, setAddForm] = useState({
    plantId: "", taskType: "WATER", frequency: "WEEKLY", nextDue: "", notes: "",
  })

  const schedId = (s: ScheduleWithPlant): string =>
    (s as any).care_schedule_id ?? (s as any).id ?? ""

  // ─── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true); setError(null)
      try {
        const { plants: list } = await plantsApi.list()
        if (cancelled) return
        setPlantList(list)
        const results = await Promise.allSettled(
          list.map(p => plantsApi.getCareSchedule(p.plant_id))
        )
        const all: ScheduleWithPlant[] = []
        results.forEach((r, i) => {
          if (r.status === "fulfilled")
            r.value.schedules.forEach((s: CareSchedule) =>
              all.push({ ...s, plantName: list[i].name, plantId: list[i].plant_id })
            )
        })
        if (!cancelled) setSchedules(all)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load schedules")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ─── Complete ───────────────────────────────────────────────────────────────
  const handleComplete = useCallback(async (schedule: ScheduleWithPlant) => {
    const id = schedId(schedule)
    if (completing === id || completedIds.has(id)) return
    setCompleting(id); setError(null)
    try {
      const res    = await plantsApi.completeCareTask(schedule.plantId, id)
      const updated: CareSchedule = res.schedule

      setSchedules(prev =>
        prev.map(s =>
          schedId(s) !== id
            ? s
            : { ...s, ...updated, plantName: s.plantName, plantId: s.plantId }
        )
      )
      setCompletedIds(prev => new Set(prev).add(id))
    } catch (e: any) {
      setError(e?.message ?? "Could not complete task.")
    } finally {
      setCompleting(null)
    }
  }, [completing, completedIds])

  // ─── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (schedule: ScheduleWithPlant) => {
    const id = schedId(schedule)
    if (!confirm("Remove this care task permanently?")) return
    setDeleting(id); setError(null)
    try {
      await plantsApi.deleteCareSchedule(schedule.plantId, id)
      setSchedules(prev => prev.filter(s => schedId(s) !== id))
      setCompletedIds(prev => { const next = new Set(prev); next.delete(id); return next })
    } catch (e: any) {
      setError(e?.message ?? "Could not delete task.")
    } finally {
      setDeleting(null)
    }
  }

  // ─── Add ────────────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.plantId) { setError("Please select a plant."); return }
    setAdding(true); setError(null)
    try {
      const payload: Record<string, any> = {
        taskType:  addForm.taskType,
        frequency: addForm.frequency,
        ...(addForm.notes   && { notes:   addForm.notes }),
        ...(addForm.nextDue && { nextDue: new Date(addForm.nextDue).toISOString() }),
      }
      const res   = await plantsApi.createCareSchedule(addForm.plantId, payload)
      const plant = plantList.find(p => p.plant_id === addForm.plantId)
      setSchedules(prev => [
        ...prev,
        { ...res.schedule, plantName: plant?.name ?? "Unknown", plantId: addForm.plantId },
      ])
      setShowAdd(false)
      setAddForm({ plantId: "", taskType: "WATER", frequency: "WEEKLY", nextDue: "", notes: "" })
    } catch (e: any) {
      setError(e?.message ?? "Could not add task.")
    } finally {
      setAdding(false)
    }
  }

  // ─── Derived ────────────────────────────────────────────────────────────────
  const now          = new Date()
  const todayMidnight = new Date(now); todayMidnight.setHours(0, 0, 0, 0)
  const todayEnd      = new Date(now); todayEnd.setHours(23, 59, 59, 999)

  const isDone = (s: ScheduleWithPlant) => completedIds.has(schedId(s))

  const pendingSchedules = schedules
    .filter(s => !isDone(s))
    .sort((a, b) =>
      (a.nextDue ? new Date(a.nextDue).getTime() : Infinity) -
      (b.nextDue ? new Date(b.nextDue).getTime() : Infinity)
    )

  const doneSchedules = schedules
    .filter(s => isDone(s))
    .sort((a, b) =>
      (a.nextDue ? new Date(a.nextDue).getTime() : Infinity) -
      (b.nextDue ? new Date(b.nextDue).getTime() : Infinity)
    )

  const overdueList  = pendingSchedules.filter(s => s.nextDue && new Date(s.nextDue) < todayMidnight)
  const todayList    = pendingSchedules.filter(s => s.nextDue && new Date(s.nextDue) >= todayMidnight && new Date(s.nextDue) <= todayEnd)
  const upcomingList = [
    ...pendingSchedules.filter(s => !s.nextDue || new Date(s.nextDue) > todayEnd),
    ...doneSchedules,
  ].sort((a, b) =>
    (a.nextDue ? new Date(a.nextDue).getTime() : Infinity) -
    (b.nextDue ? new Date(b.nextDue).getTime() : Infinity)
  )

  const overdue    = overdueList.length
  const todayCount = todayList.length

  // This Week
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const weekDays   = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayStart); d.setDate(todayStart.getDate() + i); return d
  })
  const weekEnd = new Date(weekDays[6]); weekEnd.setHours(23, 59, 59, 999)

  // ─── Task card ──────────────────────────────────────────────────────────────
  const renderTaskCard = (item: ScheduleWithPlant, overrideDate?: Date, showCompleteButton: boolean = true) => {
    const id      = schedId(item)
    const meta    = TASK_META[item.taskType] ?? TASK_META.CHECK_HEALTH
    const done    = isDone(item)
    const dueDate = overrideDate ?? (item.nextDue ? new Date(item.nextDue) : null)
    const isOverdue = !done && dueDate && dueDate < todayMidnight
    const isBusy  = completing === id || deleting === id

    return (
      <div
        key={overrideDate ? `${id}-${getDayKey(overrideDate)}` : id}
        className={cn(
          "flex items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 shadow-sm transition-all",
          isOverdue && "border-red-200 bg-red-50/30",
          done      && "border-emerald-200 bg-emerald-50/20 opacity-80",
        )}
      >
        {/* Complete button - only shown when showCompleteButton is true */}
        {showCompleteButton && (
          <button
            onClick={() => !done && handleComplete(item)}
            disabled={isBusy || done}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              done
                ? "border-emerald-500 bg-emerald-500 cursor-default"
                : "border-stone-300 hover:border-emerald-500 cursor-pointer",
              completing === id && "opacity-50 cursor-wait",
            )}
            aria-label={done ? "Completed" : "Mark complete"}
          >
            {done
              ? <CheckCircle2 className="h-4 w-4 text-white" />
              : <span className="h-3 w-3 rounded-full" />}
          </button>
        )}

        {/* Task icon */}
        <div className={cn("h-9 w-9 shrink-0 rounded-xl border flex items-center justify-center", meta.bg)}>
          <span className={meta.color}>{meta.icon}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={cn("font-semibold truncate", done ? "line-through text-stone-400" : "text-[#1A2E1A]")}>
            {item.plantName}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={done ? "text-stone-400" : meta.color}>{meta.label}</span>
            <span className="text-stone-400">• {fmtFrequency(item.frequency)}</span>
            {item.notes && <span className="text-stone-400 italic">• {item.notes}</span>}
            {dueDate && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  isOverdue
                    ? "bg-red-50 text-red-600 border-red-200"
                    : done
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                      : "bg-stone-50 text-stone-500",
                )}
              >
                {isOverdue
                  ? `Overdue · ${dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : done
                    ? `Next due · ${dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                    : `Due · ${dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
              </Badge>
            )}
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={() => handleDelete(item)}
          disabled={isBusy}
          className="shrink-0 text-stone-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
          aria-label="Delete task"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F7F6F2] p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1A2E1A] flex items-center justify-center">
            <Sprout className="h-4 w-4 text-emerald-300" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A2E1A]">Care Schedule</h1>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-[#1A2E1A] hover:bg-[#2A452A]">
          <Plus className="h-4 w-4 mr-2" /> Add Task
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-stone-400">Loading schedules…</div>
      ) : (
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="thisweek" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" /> This Week
            </TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW ── */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats + Overdue + Today + Upcoming sections (unchanged) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total tasks", value: schedules.length,  danger: false },
                { label: "Due today",   value: todayCount,         danger: false, accent: todayCount > 0 },
                { label: "Overdue",     value: overdue,            danger: true,  accent: overdue > 0 },
                { label: "Plants",      value: plantList.length,   danger: false },
              ].map(({ label, value, danger, accent }) => (
                <div key={label} className={cn(
                  "rounded-2xl border bg-white p-4 shadow-sm",
                  danger && accent  && "border-red-200 bg-red-50/40",
                  !danger && accent && "border-emerald-200 bg-emerald-50/40",
                )}>
                  <p className="text-xs text-stone-400 mb-1">{label}</p>
                  <p className={cn("text-2xl font-bold", danger && accent ? "text-red-600" : "text-[#1A2E1A]")}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {overdue > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                You have {overdue} overdue task{overdue > 1 ? "s" : ""}. Take care of them soon!
              </div>
            )}

            {overdueList.length === 0 && todayList.length === 0 && upcomingList.length === 0 ? (
              <div className="rounded-2xl border bg-white p-10 text-center text-stone-400 shadow-sm">
                No upcoming tasks. Add one to get started!
              </div>
            ) : (
              <div className="space-y-8">
                {overdueList.length > 0 && (
                  <section>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-red-600 mb-3">
                      <AlertTriangle className="h-4 w-4" /> Overdue
                      <Badge className="ml-1 bg-red-100 text-red-600 border-red-200 text-[10px]">{overdueList.length}</Badge>
                    </h3>
                    <div className="space-y-2">{overdueList.map(s => renderTaskCard(s))}</div>
                  </section>
                )}

                {todayList.length > 0 && (
                  <section>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-600 mb-3">
                      <Calendar className="h-4 w-4" /> Today
                      <Badge className="ml-1 bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">{todayList.length}</Badge>
                    </h3>
                    <div className="space-y-2">{todayList.map(s => renderTaskCard(s))}</div>
                  </section>
                )}

                {upcomingList.length > 0 && (
                  <section>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-500 mb-3">
                      <Sprout className="h-4 w-4" /> Upcoming
                      <Badge className="ml-1 bg-stone-100 text-stone-500 border-stone-200 text-[10px]">{upcomingList.length}</Badge>
                    </h3>
                    <div className="space-y-2">{upcomingList.map(s => renderTaskCard(s))}</div>
                  </section>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── THIS WEEK ── (No complete button) */}
          <TabsContent value="thisweek">
            <div className="rounded-2xl border bg-white shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <Calendar className="h-5 w-5" /> This Week's Care Tasks
              </h2>
              <p className="text-xs text-stone-400 mb-6">
                {todayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
                {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <div className="space-y-8">
                {weekDays.map((dayDate, i) => {
                  const isToday = getDayKey(dayDate) === getDayKey(now)
                  const dayStart = new Date(dayDate); dayStart.setHours(0, 0, 0, 0)
                  const dayEnd   = new Date(dayDate); dayEnd.setHours(23, 59, 59, 999)
                  const seenIds  = new Set<string>()
                  const dayTasks: { schedule: ScheduleWithPlant; date: Date }[] = []

                  pendingSchedules.forEach(s => {
                    const sid = schedId(s)
                    if (s.nextDue) {
                      const nd = new Date(s.nextDue)
                      if (getDayKey(nd) === getDayKey(dayDate)) {
                        seenIds.add(sid)
                        dayTasks.push({ schedule: s, date: nd })
                        return
                      }
                    }
                    const hits = occurrencesInRange(s, dayStart, dayEnd)
                    hits.forEach(date => {
                      if (!seenIds.has(sid)) {
                        seenIds.add(sid)
                        dayTasks.push({ schedule: s, date })
                      }
                    })
                  })
                  dayTasks.sort((a, b) => a.date.getTime() - b.date.getTime())

                  return (
                    <div key={i}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={cn(
                          "font-semibold text-sm w-28 shrink-0",
                          isToday ? "text-emerald-600" : "text-[#1A2E1A]",
                        )}>
                          {dayDate.toLocaleDateString("en-US", { weekday: "long" })}
                          {isToday && <span className="ml-1 text-[10px] font-normal text-emerald-500">(today)</span>}
                        </div>
                        <div className="text-xs text-stone-400 shrink-0">
                          {dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                        <div className="flex-1 h-px bg-stone-100" />
                        {dayTasks.length > 0 && (
                          <Badge variant="outline" className="text-[10px] shrink-0">{dayTasks.length}</Badge>
                        )}
                      </div>
                      {dayTasks.length > 0 ? (
                        <div className="space-y-2">
                          {dayTasks.map(({ schedule, date }) => 
                            renderTaskCard(schedule, date, false)  // ← false = hide complete button
                          )}
                        </div>
                      ) : (
                        <p className="text-stone-400 text-sm italic pl-4">No tasks scheduled</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Add Task Dialog (unchanged) */}
      <Dialog open={showAdd} onOpenChange={open => { setShowAdd(open); if (!open) setError(null) }}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1A2E1A]">Add Care Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-[#1A2E1A] font-medium">Plant</Label>
              <Select value={addForm.plantId} onValueChange={v => setAddForm(f => ({ ...f, plantId: v }))}>
                <SelectTrigger className="bg-white border-stone-200 focus:ring-emerald-500">
                  <SelectValue placeholder="Select a plant" />
                </SelectTrigger>
                <SelectContent className="bg-white border-stone-200">
                  {plantList.map(p => (
                    <SelectItem key={p.plant_id} value={p.plant_id} className="hover:bg-stone-50 focus:bg-stone-100 cursor-pointer">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#1A2E1A] font-medium">Task type</Label>
              <Select value={addForm.taskType} onValueChange={v => setAddForm(f => ({ ...f, taskType: v }))}>
                <SelectTrigger className="bg-white border-stone-200 focus:ring-emerald-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-stone-200">
                  {TASK_TYPES.map(t => (
                    <SelectItem key={t} value={t} className="hover:bg-stone-50 focus:bg-stone-100 cursor-pointer">
                      <span className="flex items-center gap-2">
                        <span className={TASK_META[t].color}>{TASK_META[t].icon}</span>
                        {TASK_META[t].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#1A2E1A] font-medium">Frequency</Label>
              <Select value={addForm.frequency} onValueChange={v => setAddForm(f => ({ ...f, frequency: v, nextDue: "" }))}>
                <SelectTrigger className="bg-white border-stone-200 focus:ring-emerald-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-stone-200">
                  {FREQUENCIES.map(f => (
                    <SelectItem key={f} value={f} className="hover:bg-stone-50 focus:bg-stone-100 cursor-pointer">
                      {fmtFrequency(f)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {addForm.frequency === "AS_NEEDED" && (
              <div className="space-y-1.5">
                <Label className="text-[#1A2E1A] font-medium">
                  Next due <span className="text-red-500 text-xs">* required</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={addForm.nextDue}
                  onChange={e => setAddForm(f => ({ ...f, nextDue: e.target.value }))}
                  required
                  className="bg-white border-stone-200 focus:ring-emerald-500"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[#1A2E1A] font-medium">
                Notes <span className="text-stone-400 text-xs font-normal">(optional)</span>
              </Label>
              <Input
                placeholder="e.g. Use diluted fertiliser"
                value={addForm.notes}
                onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                className="bg-white border-stone-200 focus:ring-emerald-500"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1 border-stone-200 hover:bg-stone-50"
                onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={adding}
                className="flex-1 bg-[#1A2E1A] hover:bg-[#2A452A] text-white">
                {adding ? "Adding…" : "Add Task"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}