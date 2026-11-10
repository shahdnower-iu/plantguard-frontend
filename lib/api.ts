
//  lib/api.ts — PlantGuard API client

const BASE = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/api` 
  : "http://localhost:3001/api";
// ─── Token helpers ────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("accessToken")
}

export function setTokens(access: string) {
  localStorage.setItem("accessToken", access)
}

export function clearTokens() {
  localStorage.removeItem("accessToken")
  localStorage.removeItem("user")
}

// ─── Refresh logic (singleton — prevents multiple parallel refresh calls) ─────

let _refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  if (_refreshPromise) return _refreshPromise

  _refreshPromise = fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
    .then(async (res) => {
      if (!res.ok) throw new Error("Refresh failed")
      const data = await res.json()
      setTokens(data.accessToken)
      return data.accessToken as string
    })
    .finally(() => {
      _refreshPromise = null
    })

  return _refreshPromise
}

// ─── Core request function ────────────────────────────────────────────────────
//
// _retry flag prevents an infinite loop:
//   request → 401 → refresh → retry → if still 401 → logout (not another refresh)

async function req<T>(
  path: string,
  options: RequestInit = {},
  isFormData = false,
  _retry = false,          // ← internal flag, do not pass from call sites
): Promise<T> {
  const token = getToken()

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> ?? {}),
  }
  if (!isFormData) headers["Content-Type"] = "application/json"
  if (token)       headers["Authorization"] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  })

  
 // ── 401 handling ─────────────────────────────────────────────────────────────
 if (res.status === 401) {
  // ✅ LOGIN ENDPOINT: wrong credentials — never redirect, just surface the error
  if (path === "/auth/login" || path === "/auth/google") {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.message ?? "Invalid email or password. Please try again.")
  }

  // Already retried once → refresh token is also dead → log out
  if (_retry) {
    clearTokens()
    if (typeof window !== "undefined") window.location.href = "/login"
    throw new Error("Session expired")
  }

  try {
    await refreshAccessToken()
    return req<T>(path, options, isFormData, true)
  } catch {
    clearTokens()
    if (typeof window !== "undefined") window.location.href = "/login"
    throw new Error("Session expired")
  }
}

  // ── Parse response ────────────────────────────────────────────────────────────
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.message ?? data?.error ?? "Request failed")
  return data as T
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export const auth = {
  register: (body: any) =>
    req<{ message: string }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  verifyEmail: async (email: string, otp: string) => {
    const result = await req<{ accessToken: string; user: AuthUser }>(
      "/auth/verify-email", { method: "POST", body: JSON.stringify({ email, otp }) }
    )
    setTokens(result.accessToken)
    return result
  },

  // FIXED LOGIN
  login: async (email: string, password: string) => {
    const result = await req<{ accessToken: string; user: AuthUser }>(
      "/auth/login", 
      { 
        method: "POST", 
        body: JSON.stringify({ email, password }) 
      }
    )
    setTokens(result.accessToken)
    return result
  },

  // FIXED GOOGLE SIGN IN
  googleSignIn: async (idToken: string) => {
    const result = await req<{ accessToken: string; user: AuthUser; isNewUser: boolean }>(
      "/auth/google", 
      { 
        method: "POST", 
        body: JSON.stringify({ idToken }) 
      }
    )
    setTokens(result.accessToken)
    return result
  },

  logout: async () => {
    const result = await req<{ message: string }>("/auth/logout", { method: "POST" })
    clearTokens()
    return result
  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  userId: string; firstName: string; lastName: string; email: string
  plan: "FREE" | "PRO"; profileImageUrl?: string; phoneNumber?: string
  country?: string; city?: string; timezone?: string
}

export interface Plant {
  id: any;
  plant_id: string;
  name: string; plantType: string; scientificName?: string
  location?: string; notes?: string; imageUrl?: string
  lastWatered?: string; lastFertilized?: string
  createdAt: string; updatedAt: string
  latestHealthScore?: number; latestScanDate?: string
}

export interface CareSchedule {
  care_schedule_id: string  // ← was: id: string
  plantId: string
  taskType: "WATER" | "FERTILIZE" | "PRUNE" | "REPOT" | "CHECK_HEALTH"
  frequency: "DAILY" | "TWICE_WEEKLY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "AS_NEEDED"
  notes?: string; nextDue?: string; lastCompleted?: string
}

// ─── USER ─────────────────────────────────────────────────────────────────────

export const user = {
  getProfile: () => req<{ user: AuthUser }>("/user/profile"),
  updateProfile: (body: Partial<AuthUser>) =>
    req<{ user: AuthUser }>("/user/profile", { method: "PUT", body: JSON.stringify(body) }),
  updateProfileImage: (file: File) => {
    const fd = new FormData(); fd.append("image", file)
    return req<{ imageUrl: string }>("/user/profile/image", { method: "POST", body: fd }, true)
  },
  changePassword: (currentPassword: string, newPassword: string) =>
    req<{ message: string }>("/user/password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) }),
  deleteAccount: () => req<{ message: string }>("/user/account", { method: "DELETE" }),
  getSubscription: () =>
    req<{ plan: string; subscriptionEndDate?: string; scansUsed?: number; scanLimit?: number }>("/user/subscription"),
  getSeasonalTip: (params?: { city?: string; country?: string }) => {
    const qs = new URLSearchParams()
    if (params?.city)    qs.set("city",    params.city)
    if (params?.country) qs.set("country", params.country)
    const query = qs.toString() ? `?${qs.toString()}` : ""
    return req<{ tip: string; season: string; location: string; generatedAt: string }>(
      `/user/seasonal-tip${query}`
    )
  },
}

// ─── PLANTS ───────────────────────────────────────────────────────────────────

export const plants = {
  list: () => req<{ plants: Plant[] }>("/plants"),
  get: (id: string) => req<{ plant: Plant }>(`/plants/${id}`),
  create: (data: FormData) => req<{ plant: Plant }>("/plants", { method: "POST", body: data }, true),
  update: (id: string, data: FormData | object) => {
    const isForm = data instanceof FormData
    return req<{ plant: Plant }>(`/plants/${id}`, { method: "PUT", body: isForm ? data : JSON.stringify(data) }, isForm)
  },
  delete: (id: string) => req<{ message: string }>(`/plants/${id}`, { method: "DELETE" }),
  getCareSchedule: (id: string) => req<{ schedules: CareSchedule[] }>(`/plants/${id}/care-schedule`),
  createCareSchedule: (id: string, data: object) =>
    req<{ schedule: CareSchedule }>(`/plants/${id}/care-schedule`, { method: "POST", body: JSON.stringify(data) }),
  completeCareTask: (plantId: string, scheduleId: string) =>
    req<{ schedule: CareSchedule }>(`/plants/${plantId}/care-schedule/${scheduleId}/complete`, { method: "POST" }),
  deleteCareSchedule: (plantId: string, scheduleId: string) =>
    req<{ message: string }>(`/plants/${plantId}/care-schedule/${scheduleId}`, { method: "DELETE" }),
}

// ─── DETECT ───────────────────────────────────────────────────────────────────

export interface ScanResult {
  scanId: string; plantId: string; plantCreated?: boolean
  disease?: string; isHealthy: boolean; confidence: number
  description?: string; treatment?: string[]; imageUrl?: string
  createdAt: string; healthScore?: number
}

export const detect = {
  predict: (image: File, plantId?: string) => {
    const fd = new FormData(); fd.append("image", image); if (plantId) fd.append("plantId", plantId)
    return req<{ success: boolean; data: ScanResult }>("/detect/predict", { method: "POST", body: fd }, true)
  },
  history: (plantId?: string) =>
    req<{ scans: ScanResult[] }>(`/detect/history${plantId ? `?plantId=${plantId}` : ""}`),
}

// ─── SPREAD ───────────────────────────────────────────────────────────────────
//
// POST /api/spread/analyze
//   Accepts 1–4 images + optional plantId.
//   If plantId is omitted the backend auto-creates a plant and returns plantCreated: true.
//
// GET /api/spread/history[?plantId=...]
//   Returns the 50 most recent SpreadScanResult records for the authenticated user.

export interface SpreadScanResult {
  // Identity
  scanId:               string
  plantId:              string      // always present — supplied or auto-created
  plantCreated:         boolean     // true when a new plant was created from this scan

  // Validity
  valid:                boolean
  rejectReason?:        string      // present when valid === false

  // Images
  imageUrls:            string[]
  imagesAnalyzed:       number

  // Disease info
  diseaseName?:         string
  pathogenType?:        string      // "fungal" | "bacterial" | "viral" | "pest" | "abiotic"

  // Spread metrics
  spreadPercentage?:    number      // 0–100
  confidence?:          number      // 0–100
  severity?:            string      // "mild" | "moderate" | "severe" | "critical"
  affectedAreaEstimate?: string     // e.g. "30% of leaf surface"
  spreadRate?:          string      // "slow" | "moderate" | "fast" | "very fast"
  diseaseStage?:        string      // "early" | "developing" | "advanced" | "terminal"

  // Affected areas
  plantPartAffected:    string[]
  visualSymptoms:       string[]

  // Risk
  riskToPlant?:         string
  contagionRisk?:       string      // "low" | "medium" | "high"
  riskLabel?:           string      // "Safe" | "Monitor" | "Act Now" | "Urgent"

  // Narrative
  analysis?:            string
  recommendations:      string[]
  requiresLabConfirm:   boolean

  // Meta
  createdAt:            string
  _meta:                { model: string; analyzed_at: string }
}

export const spread = {
  /**
   * POST /api/spread/analyze
   * @param images   1–4 File objects to upload
   * @param plantId  Optional — link scan to an existing plant.
   *                 When omitted the backend auto-creates a plant.
   */
  analyze: (images: File[], plantId?: string) => {
    const fd = new FormData()
    images.forEach(img => fd.append("images", img))
    if (plantId) fd.append("plantId", plantId)
    return req<{ success: boolean; data: SpreadScanResult }>(
      "/spread/analyze", { method: "POST", body: fd }, true
    )
  },

  /**
   * GET /api/spread/history[?plantId=...]
   * @param plantId  Optional — filter results to a single plant
   */
  history: (plantId?: string) =>
    req<{ scans: SpreadScanResult[] }>(
      `/spread/history${plantId ? `?plantId=${plantId}` : ""}`
    ),
}

// ─── CHAT ─────────────────────────────────────────────────────────────────────

// ─── CHAT ─────────────────────────────────────────────────────────────────────

export interface ChatSession {
  id: string;
  chat_session_id?: string;   // backend field
  title?: string;
  model?: string;
  plantId?: string;
  scanId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  createdAt: string;
}

export const chat = {
  createSession: (data: object) =>
    req<{ session: ChatSession }>("/chat/sessions", { method: "POST", body: JSON.stringify(data) }),

  getSessions: () => 
    req<{ sessions: ChatSession[] }>("/chat/sessions"),

  getMessages: (sessionId: string) =>
    req<{ messages: ChatMessage[]; currentModel?: any; plantId?: string; scanId?: string }>(
      `/chat/sessions/${sessionId}/messages`
    ),

  sendMessage: (data: object | FormData) => {
    const isForm = data instanceof FormData;
    return req<{
      reply: string;
      sessionId: string;
      messageId: string;
      model: any;
      switched: boolean;
    }>("/chat", { 
      method: "POST", 
      body: isForm ? data : JSON.stringify(data) 
    }, isForm);
  },

  deleteSession: (sessionId: string) =>
    req<{ message: string }>(`/chat/sessions/${sessionId}`, { method: "DELETE" }),
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export interface Notification {
  notification_id: string; userId: string; type: string
  status: "PENDING" | "SENT" | "READ"; title: string; body: string; createdAt: string
}

export const notifications = {
  list: (onlyUnread = false) =>
    req<{ notifications: Notification[] }>(`/notifications${onlyUnread ? "?unread=true" : ""}`),
  unreadCount: () => req<{ count: number }>("/notifications/unread-count"),
  markRead: (id: string) => req<{ message: string }>(`/notifications/${id}/read`, { method: "POST" }),
  markAllRead: () => req<{ message: string }>("/notifications/read-all", { method: "POST" }),
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

export interface PlantOverview {
  plantId: string
  name: string
  // FIX: null when plant has never been scanned (prevents 0/100 display)
  latestHealthScore: number | null
  // FIX: renamed from totalScans — matches service field name
  scanCount: number
  // FIX: plain string union — service was returning a TrendResult object before
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data' | 'no_data'
  lastScanned: string | null
}
export interface PlantTimeline {
  plantId: string; name: string; timeline: { date: string; healthScore: number; disease?: string }[]
}
export interface MonthlyReport {
  month: string
  totalScans: number
  healthyScans: number
  // FIX: was diseasesDetected in old service — now correctly named diseasedScans
  diseasedScans: number
  // FIX: added — plants created this month
  newPlants: number
  mostProblematicPlant: string | null
  mostCommonDisease: string | null
  // FIX: was overallHealthScore in old service — now correctly named avgHealthScore
  avgHealthScore: number
  // FIX: added — top diseases array for charts
  topDiseases: { name: string; count: number }[]
  plantSummaries: {
    plantId: string
    plantName: string
    scansThisMonth: number
    diseases: string[]
    averageScore: number
  }[]
  insight: string
}

export const analytics = {
  overview: () => req<{ plants: PlantOverview[] }>("/analytics/overview"),
  plantTimeline: (plantId: string) => req<PlantTimeline>(`/analytics/plant/${plantId}/timeline`),
  monthlyReport: (month?: string) =>
    req<MonthlyReport>(`/analytics/report${month ? `?month=${month}` : ""}`),
}

// ─── PAYMENT ──────────────────────────────────────────────────────────────────

export interface Payment {
  id: string; amount: number; currency: string; plan: string
  durationDays: number; status: string; reference: string; createdAt: string
}

export const payment = {
  create: (body: { amount: number; currency?: string; plan: "PRO"; durationDays?: number }) =>
    req<{ reference: string; expiresAt: string; amount: number }>("/payment", { method: "POST", body: JSON.stringify(body) }),
  confirm: (ref: string) =>
    req<{ subscriptionEndDate: string; daysAdded: number }>(`/payment/${ref}/confirm`, { method: "POST" }),
  history: () => req<{ payments: Payment[] }>("/payment/history"),
}