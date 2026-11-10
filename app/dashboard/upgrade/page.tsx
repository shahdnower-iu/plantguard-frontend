"use client"

// app/dashboard/upgrade/page.tsx

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Crown, Check, CreditCard, Zap, Clock, AlertCircle,
  Lock, ChevronRight, Sparkles, ArrowLeft, Shield, Star
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { payment } from "@/lib/api"
import { useApp } from "@/context/AppContext"

// ─── Data ─────────────────────────────────────────────────────────────────────

const plans = [
  {
    days: 30,
    label: "Base",
    sublabel: "Monthly",
    price: 49,
    popular: false,
    color: "#235347",
    features: ["15 Disease Scans / week","10 Disease spread analysis / week", "Basic disease detection", "AI chat assistant", "Care reminders"],
  },
  {
    days: 90,
    label: "Pro",
    sublabel: "3 Months",
    price: 129,
    popular: true,
    saving: "Save 17%",
    color: "#235347",
    features: ["Unlimited Scans", "Advanced AI detection", "Spread analysis (4 photos)", "AI chat assistant", "Care reminders"],
  },
  {
    days: 365,
    label: "Enterprise",
    sublabel: "Annual",
    price: 349,
    popular: false,
    saving: "Save 33%",
    color: "#235347",
    features: ["access for the entire year","Unlimited scans", "Advanced AI detection", "Spread analysis (4 photos)", "Priority AI assistant", "Monthly reports", "Full health analytics"],
  },
]

// ─── Fake Stripe test cards ────────────────────────────────────────────────────
const TEST_CARDS = [
  { label: "Visa · Success",    number: "4242 4242 4242 4242", expiry: "12/26", cvv: "123", brand: "visa" },
  { label: "Mastercard",        number: "5555 5555 5555 4444", expiry: "08/27", cvv: "321", brand: "mc" },
  { label: "Declined card",     number: "4000 0000 0000 0002", expiry: "01/26", cvv: "999", brand: "visa" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCard(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim()
}
function fmtExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

function generateReceiptId() {
  return Math.floor(Math.random() * 9000000000000 + 1000000000000).toString()
}

function CardBrandIcon({ brand }: { brand: string }) {
  if (brand === "mc") {
    return (
      <div className="flex items-center">
        <div className="w-5 h-5 rounded-full bg-red-500 opacity-90" />
        <div className="w-5 h-5 rounded-full bg-yellow-400 opacity-90 -ml-2" />
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center w-9 h-6 bg-emerald-600 rounded text-white text-[9px] font-bold tracking-wider">
      VISA
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UpgradePage() {
  const router = useRouter()
  const { currentUser, refreshUser } = useApp()

  const [selectedPlan, setSelectedPlan] = useState(1)
  const [step, setStep] = useState<"choose" | "pay" | "processing" | "success" | "failed">("choose")
  const [reference, setReference] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successDate, setSuccessDate] = useState("")
  const [receiptId] = useState(generateReceiptId)
  const [subscription, setSubscription] = useState<{ plan: string; subscriptionEndDate?: string } | null>(null)
  const [progress, setProgress] = useState(0)

  const card = useRef({ number: "", expiry: "", cvv: "", name: "" })
  const [cardState, setCardState] = useState({ number: "", expiry: "", cvv: "", name: "" })
  const [cardError, setCardError] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [detectedBrand, setDetectedBrand] = useState<"visa" | "mc" | "">("")

  useEffect(() => {
    import("@/lib/api").then(({ user }) =>
      user.getSubscription().then(d => setSubscription(d)).catch(() => {})
    )
  }, [])

  // Animate progress bar during processing
  useEffect(() => {
    if (step !== "processing") { setProgress(0); return }
    setProgress(0)
    const t = setTimeout(() => setProgress(40), 100)
    const t2 = setTimeout(() => setProgress(75), 800)
    const t3 = setTimeout(() => setProgress(95), 1600)
    return () => { clearTimeout(t); clearTimeout(t2); clearTimeout(t3) }
  }, [step])

  function updateCard(field: string, value: string) {
    const next = { ...cardState, [field]: value }
    card.current = next
    setCardState(next)
    if (field === "number") {
      const raw = value.replace(/\s/g, "")
      if (raw.startsWith("4")) setDetectedBrand("visa")
      else if (raw.startsWith("5")) setDetectedBrand("mc")
      else setDetectedBrand("")
    }
  }

  // ── Step 1: create payment reference ────────────────────────────────────────
  const handleProceedToPayment = async () => {
    const plan = plans[selectedPlan]
    setLoading(true); setError(null)
    try {
      const result = await payment.create({ amount: plan.price, plan: "PRO", durationDays: plan.days })
      setReference(result.reference)
      setExpiresAt(result.expiresAt)
      setStep("pay")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create payment.")
    } finally { setLoading(false) }
  }

  // ── Step 2: Stripe-style card processing ────────────────────────────────────
  const handlePayNow = async () => {
    setCardError(null)
    const rawNumber = cardState.number.replace(/\s/g, "")
    if (rawNumber.length < 16)   { setCardError("Enter a valid 16-digit card number."); return }
    if (cardState.expiry.length < 5)  { setCardError("Enter a valid expiry date (MM/YY)."); return }
    if (cardState.cvv.length < 3)     { setCardError("Enter a valid CVV."); return }
    if (!cardState.name.trim())       { setCardError("Enter the cardholder name."); return }

    const isDecline = rawNumber === "4000000000000002"
    setStep("processing")
    await new Promise(r => setTimeout(r, 2400))

    if (isDecline) { setStep("failed"); return }

    try {
      const result = await payment.confirm(reference)
      setSuccessDate(result.subscriptionEndDate)
      await refreshUser()
      setStep("success")
    } catch {
      setStep("failed")
    }
  }

  // ── Already PRO guard ────────────────────────────────────────────────────────
  if (subscription?.plan === "PRO" && step === "choose") {
    return (
      <div className="min-h-screen bg-[#F6F9FC] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-sm border border-[#E6EBF1] p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <Crown className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A1F36]">You're already on Pro!</h1>
          <p className="mt-2 text-sm text-[#697386]">
            Active{subscription.subscriptionEndDate
              ? ` until ${new Date(subscription.subscriptionEndDate).toLocaleDateString()}`
              : ""}.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-5 py-2.5 rounded-xl bg-[#10B981] text-white text-sm font-medium hover:bg-[#059669] transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => setSubscription(s => s ? { ...s, plan: "FREE" } : s)}
              className="px-5 py-2.5 rounded-xl border border-[#235347] text-[#1A1F36] text-sm font-medium hover:bg-[#F6F9FC] transition-colors"
            >
              Extend Plan
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F6F9FC] font-sans">
      {/* ── STEP: choose plan ─────────────────────────────────────────────────── */}
      {step === "choose" && (
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white border border-[#E6EBF1] rounded-full px-4 py-1.5 text-xs font-medium text-[#10B981] mb-5 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              PlantGuard Pro
            </div>
            <h1 className="text-4xl font-bold text-[#1A1F36] tracking-tight">Simple, transparent pricing</h1>
          </div>

          {/* Plan cards */}
          <div className="grid gap-5 md:grid-cols-3 items-end">
            {plans.map((plan, i) => {
              const isSelected = selectedPlan === i
              const isPro = plan.popular
              return (
                <button
                  key={i}
                  onClick={() => setSelectedPlan(i)}
                  className={`relative rounded-3xl p-8 text-left transition-all duration-200 outline-none group
                    ${isPro
                      ? "bg-[#10B981] text-white shadow-2xl scale-[1.03] -mt-4"
                      : "bg-white border border-[#E6EBF1] text-[#1A1F36] hover:shadow-md"
                    }
                    ${isSelected && !isPro ? "ring-2 ring-[#10B981] ring-offset-2" : ""}
                  `}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-white text-[#10B981] text-[10px] font-bold uppercase tracking-widest rounded-full px-4 py-1 shadow-sm">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <p className={`text-4xl font-bold tracking-tight ${isPro ? "text-white" : "text-[#1A1F36]"}`}>
                      {plan.price} <span className={`text-base font-normal ${isPro ? "text-emerald-100" : "text-[#697386]"}`}>EGP/month</span>
                    </p>
                    <p className={`text-lg font-semibold mt-2 ${isPro ? "text-white" : "text-[#1A1F36]"}`}>
                      {plan.label}
                    </p>
                    <p className={`text-sm mt-1 ${isPro ? "text-emerald-100" : "text-[#697386]"}`}>
                      For most businesses that want to optimize web queries
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isPro ? "bg-white/20" : "bg-[#F6F9FC]"}`}>
                          <Check className={`h-3 w-3 ${isPro ? "text-white" : "text-[#10B981]"}`} />
                        </div>
                        <span className={isPro ? "text-emerald-50" : "text-[#3C4257]"}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div
                    className={`w-full py-3 rounded-2xl text-sm font-semibold text-center transition-all
                      ${isPro
                        ? "bg-white text-[#10B981] hover:bg-emerald-50"
                        : "border border-[#E6EBF1] text-[#3C4257] hover:bg-[#F6F9FC] group-hover:border-[#10B981] group-hover:text-[#10B981]"
                      }
                    `}
                  >
                    {i < selectedPlan ? "Downgrade" : i === selectedPlan ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <Check className="h-3.5 w-3.5" /> Selected
                      </span>
                    ) : "Upgrade"}
                  </div>

                  {plan.saving && (
                    <div className={`absolute top-5 right-5 text-[11px] font-bold px-2.5 py-1 rounded-full
                      ${isPro ? "bg-white/20 text-white" : "bg-green-100 text-green-700"}`}>
                      {plan.saving}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {error && (
            <div className="mt-6 max-w-md mx-auto flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-3 rounded-2xl border border-[#E6EBF1] text-[#697386] text-sm font-medium hover:bg-white transition-colors"
            >
              Maybe later
            </button>
            <button
              onClick={handleProceedToPayment}
              disabled={loading}
              className="px-8 py-3 rounded-2xl bg-[#10B981] text-white text-sm font-semibold hover:bg-[#059669] transition-colors disabled:opacity-60 flex items-center gap-2 shadow-lg shadow-[#10B981]/25"
            >
              <Crown className="h-4 w-4" />
              {loading ? "Processing..." : `Continue — ${plans[selectedPlan].price} EGP`}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <p className="text-center text-xs text-[#A3ACB9] mt-6 flex items-center justify-center gap-1.5">
            <Lock className="h-3 w-3" />
            Secured by Stripe · SSL encrypted · Cancel anytime
          </p>
        </div>
      )}

      {/* ── STEP: payment form ────────────────────────────────────────────────── */}
      {step === "pay" && (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-[440px]">
            {/* Back */}
            <button
              onClick={() => { setStep("choose"); setCardError(null) }}
              className="flex items-center gap-1.5 text-sm text-[#697386] hover:text-[#1A1F36] mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to plans
            </button>

            {/* Order summary */}
            <div className="bg-white rounded-3xl border border-[#E6EBF1] p-6 mb-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#A3ACB9] uppercase tracking-widest font-medium mb-1">Order summary</p>
                  <p className="text-2xl font-bold text-[#1A1F36]">{plans[selectedPlan].price} EGP</p>
                  <p className="text-sm text-[#697386] mt-0.5">{plans[selectedPlan].label} Plan · {plans[selectedPlan].sublabel}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-[#10B981]" />
                </div>
              </div>
              {expiresAt && (
                <div className="mt-4 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  Session expires at {new Date(expiresAt).toLocaleTimeString()}
                </div>
              )}
            </div>

            {/* Test card hints */}
            <div className="bg-white rounded-3xl border border-dashed border-[#A7F3D0] p-4 mb-4">
              <p className="text-xs font-semibold text-[#10B981] mb-2.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Test cards (click to fill)
              </p>
              <div className="space-y-1.5">
                {TEST_CARDS.map(tc => (
                  <button
                    key={tc.number}
                    onClick={() => {
                      updateCard("number", tc.number)
                      updateCard("expiry", tc.expiry)
                      updateCard("cvv", tc.cvv)
                      updateCard("name", "Test User")
                      setDetectedBrand(tc.brand as "visa" | "mc")
                    }}
                    className="w-full flex items-center justify-between rounded-xl border border-[#E6EBF1] bg-[#F6F9FC] px-3 py-2.5 text-xs hover:border-[#10B981] hover:bg-[#ECFDF5] transition-all text-left"
                  >
                    <span className="font-medium text-[#1A1F36]">{tc.label}</span>
                    <span className="font-mono text-[#697386]">{tc.number}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment form */}
            <div className="bg-white rounded-3xl border border-[#E6EBF1] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold text-[#1A1F36] flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#10B981]" />
                  Payment details
                </h2>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-[#A3ACB9]" />
                  <span className="text-xs text-[#A3ACB9] font-medium">SSL secured</span>
                </div>
              </div>

              {/* Name */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-[#697386] uppercase tracking-wide mb-1.5">
                  Cardholder Name
                </label>
                <input
                  className={`w-full h-11 px-4 rounded-xl border text-sm text-[#1A1F36] placeholder:text-[#C5CDD9] outline-none transition-all bg-[#FAFBFC]
                    ${focusedField === "name" ? "border-[#10B981] ring-2 ring-[#10B981]/15" : "border-[#E6EBF1] hover:border-[#BCC0CE]"}`}
                  placeholder="Jane Smith"
                  value={cardState.name}
                  onChange={e => updateCard("name", e.target.value)}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                />
              </div>

              {/* Card number */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-[#697386] uppercase tracking-wide mb-1.5">
                  Card Number
                </label>
                <div className="relative">
                  <input
                    className={`w-full h-11 pl-4 pr-14 rounded-xl border text-sm text-[#1A1F36] placeholder:text-[#C5CDD9] outline-none transition-all bg-[#FAFBFC] font-mono tracking-widest
                      ${focusedField === "number" ? "border-[#10B981] ring-2 ring-[#10B981]/15" : "border-[#E6EBF1] hover:border-[#BCC0CE]"}`}
                    placeholder="1234 5678 9012 3456"
                    value={cardState.number}
                    onChange={e => updateCard("number", fmtCard(e.target.value))}
                    onFocus={() => setFocusedField("number")}
                    onBlur={() => setFocusedField(null)}
                    maxLength={19}
                  />
                  {detectedBrand && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CardBrandIcon brand={detectedBrand} />
                    </div>
                  )}
                </div>
              </div>

              {/* Expiry + CVV */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-[#697386] uppercase tracking-wide mb-1.5">
                    Expiry
                  </label>
                  <input
                    className={`w-full h-11 px-4 rounded-xl border text-sm text-[#1A1F36] placeholder:text-[#C5CDD9] outline-none transition-all bg-[#FAFBFC] font-mono
                      ${focusedField === "expiry" ? "border-[#10B981] ring-2 ring-[#10B981]/15" : "border-[#E6EBF1] hover:border-[#BCC0CE]"}`}
                    placeholder="MM / YY"
                    value={cardState.expiry}
                    onChange={e => updateCard("expiry", fmtExpiry(e.target.value))}
                    onFocus={() => setFocusedField("expiry")}
                    onBlur={() => setFocusedField(null)}
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#697386] uppercase tracking-wide mb-1.5">
                    CVV
                  </label>
                  <input
                    className={`w-full h-11 px-4 rounded-xl border text-sm text-[#1A1F36] placeholder:text-[#C5CDD9] outline-none transition-all bg-[#FAFBFC] font-mono
                      ${focusedField === "cvv" ? "border-[#10B981] ring-2 ring-[#10B981]/15" : "border-[#E6EBF1] hover:border-[#BCC0CE]"}`}
                    placeholder="123"
                    value={cardState.cvv}
                    onChange={e => updateCard("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))}
                    onFocus={() => setFocusedField("cvv")}
                    onBlur={() => setFocusedField(null)}
                    maxLength={4}
                  />
                </div>
              </div>

              {cardError && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 mb-4">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {cardError}
                </div>
              )}

              <button
                onClick={handlePayNow}
                className="w-full h-12 rounded-2xl bg-[#10B981] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#059669] transition-colors shadow-lg shadow-[#10B981]/30"
              >
                <Lock className="h-4 w-4" />
                Pay {plans[selectedPlan].price} EGP
              </button>

              <p className="text-center text-[11px] text-[#A3ACB9] mt-4 flex items-center justify-center gap-1.5">
                Powered by Stripe · No real charge
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP: processing ──────────────────────────────────────────────────── */}
      {step === "processing" && (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl border border-[#E6EBF1] shadow-sm p-10 max-w-sm w-full text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#ECFDF5" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="34" fill="none" stroke="#10B981" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                  style={{ transition: "stroke-dashoffset 0.8s ease" }}
                />
              </svg>
              <CreditCard className="h-7 w-7 text-[#10B981] absolute inset-0 m-auto" />
            </div>
            <p className="text-lg font-bold text-[#1A1F36]">Processing payment…</p>
            <p className="text-sm text-[#697386] mt-1.5">Verifying your card with Stripe</p>
            <div className="mt-5 space-y-2">
              {["Encrypting card details", "Contacting your bank", "Activating subscription"].map((s, i) => (
                <div key={s} className={`flex items-center gap-2 text-xs transition-all duration-500 ${progress > i * 33 ? "text-[#1A1F36]" : "text-[#C5CDD9]"}`}>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${progress > i * 33 ? "border-[#10B981] bg-[#10B981]" : "border-[#E6EBF1]"}`}>
                    {progress > i * 33 && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP: success ─────────────────────────────────────────────────────── */}
      {step === "success" && (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#F6F9FC]">
          <div className="max-w-sm w-full">
            <div className="bg-white relative">
              <div className="rounded-t-3xl px-8 pt-10 pb-8 border border-[#E6EBF1] border-b-0">
                <div className="text-4xl text-center mb-3">🎉</div>
                <h2 className="text-2xl font-bold text-[#1A1F36] text-center">Thank you!</h2>
                <p className="text-sm text-[#697386] text-center mt-1">Your Pro subscription has been activated successfully</p>

                <div className="flex items-center my-7 gap-1">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div key={i} className="flex-1 h-px bg-[#E6EBF1]" />
                  ))}
                </div>

                <div className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-[#A3ACB9] uppercase tracking-widest">Order ID</p>
                      <p className="text-sm font-bold text-[#1A1F36] mt-0.5 font-mono">{receiptId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-[#A3ACB9] uppercase tracking-widest">Amount</p>
                      <p className="text-sm font-bold text-[#1A1F36] mt-0.5">{plans[selectedPlan].price} EGP</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-[#A3ACB9] uppercase tracking-widest">Date &amp; Time</p>
                    <p className="text-sm font-semibold text-[#1A1F36] mt-0.5">
                      {new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })} · {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 bg-[#F6F9FC] rounded-2xl px-4 py-3">
                    {detectedBrand === "mc" ? (
                      <div className="flex items-center">
                        <div className="w-5 h-5 rounded-full bg-red-500" />
                        <div className="w-5 h-5 rounded-full bg-yellow-400 -ml-2" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-9 h-6 bg-emerald-600 rounded text-white text-[9px] font-bold tracking-wider">VISA</div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-[#1A1F36]">{cardState.name || "Card Holder"}</p>
                      <p className="text-xs text-[#697386]">•••• {cardState.number.replace(/\s/g, "").slice(-4) || "****"}</p>
                    </div>
                  </div>

                  {successDate && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 text-sm text-emerald-700">
                      <Star className="h-4 w-4 shrink-0 fill-emerald-500 text-emerald-500" />
                      Pro active until {new Date(successDate).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex items-center my-7 gap-1">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div key={i} className="flex-1 h-px bg-[#E6EBF1]" />
                  ))}
                </div>

                <div className="flex items-end justify-center gap-px h-10 opacity-30">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-[#1A1F36]"
                      style={{ width: i % 3 === 0 ? 3 : 1.5, height: `${50 + Math.sin(i * 0.7) * 30}%` }}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-center text-[#A3ACB9] font-mono mt-2 tracking-widest">{receiptId.slice(0, 7)} {receiptId.slice(7)}</p>
              </div>

              <div className="relative h-6 border-x border-[#E6EBF1] overflow-hidden flex">
                <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-[#F6F9FC] border border-[#E6EBF1]" />
                <div className="flex-1 border-t border-dashed border-[#E6EBF1] mt-3" />
                <div className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-[#F6F9FC] border border-[#E6EBF1]" />
              </div>

              <div className="rounded-b-3xl px-8 py-6 border border-[#E6EBF1] border-t-0">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full h-12 rounded-2xl bg-[#10B981] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#059669] transition-colors shadow-lg shadow-[#10B981]/25"
                >
                  <Zap className="h-4 w-4" /> Start Using Pro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP: failed ──────────────────────────────────────────────────────── */}
      {step === "failed" && (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl border border-red-100 p-10 max-w-sm w-full text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-[#1A1F36]">Payment Declined</h2>
            <p className="mt-2 text-sm text-[#697386]">
              Your card was declined. Please check your details and try again, or use a different card.
            </p>
            <div className="mt-7 flex flex-col gap-3">
              <button
                onClick={() => setStep("pay")}
                className="w-full h-11 rounded-2xl bg-[#10B981] text-white text-sm font-semibold hover:bg-[#059669] transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => setStep("choose")}
                className="w-full h-11 rounded-2xl border border-[#E6EBF1] text-[#697386] text-sm font-medium hover:bg-[#F6F9FC] transition-colors"
              >
                Change Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}