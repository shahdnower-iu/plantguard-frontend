"use client"

// This page handles two flows:
// 1. Email-verification after registration (reads pending_email from localStorage)
// 2. Reset-OTP verification (reads reset_email from localStorage)

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp"
import AuthShell, { AuthLogo, authStyles } from "@/components/AuthShell"

export default function VerifyPage() {
  const router = useRouter()
  const [otp, setOtp] = useState("")
  const [email, setEmail] = useState("")
  const [mode, setMode] = useState<"register" | "reset">("register")
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const pending = localStorage.getItem("pending_email")
    const reset   = localStorage.getItem("reset_email")
    if (reset) { setEmail(reset); setMode("reset"); return }
    if (pending) { setEmail(pending); setMode("register"); return }
    router.replace("/register")
  }, [router])

  function startCountdown() {
    setResendCountdown(60)
    const id = setInterval(() => {
      setResendCountdown(p => { if (p <= 1) { clearInterval(id); return 0 } return p - 1 })
    }, 1000)
  }

  async function handleVerify() {
    if (otp.length !== 6) return
    setLoading(true); setError(null)
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

    try {
      if (mode === "reset") {
        const res = await fetch(`${apiBase}/api/auth/verify-reset-otp`, {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ email, otp }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.message ?? "Invalid or expired code."); setOtp(""); return }
        localStorage.setItem("reset_otp", otp)
        router.push("/reset-password")
      } else {
        const res = await fetch(`${apiBase}/api/auth/verify-email`, {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ email, otp }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.message ?? "Invalid or expired code."); setOtp(""); return }
        localStorage.removeItem("pending_email")
        router.push("/dashboard")
      }
    } catch {
      setError("Something went wrong. Please try again.")
      setOtp("")
    } finally { setLoading(false) }
  }

  useEffect(() => { if (otp.length === 6) handleVerify() }, [otp]) // eslint-disable-line

  async function handleResend() {
    if (resendCountdown > 0 || !email) return
    setResendLoading(true); setError(null)
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    const endpoint = mode === "reset" ? "/api/auth/forgot-password" : "/api/auth/resend-verification"
    try {
      await fetch(`${apiBase}${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ email }),
      })
      startCountdown()
    } catch { setError("Failed to resend code.") }
    finally { setResendLoading(false) }
  }

  const s = authStyles
  const title = mode === "reset" ? "Enter reset code" : "Verify your email"
  const sub   = mode === "reset" ? "We sent a 6-digit reset code to" : "We sent a 6-digit verification code to"

  return (
    <AuthShell>
      <AuthLogo />
      <h1 style={s.heading}>{title}</h1>
      <p style={s.sub}>
        {sub}{" "}
        <span style={{ color: "var(--auth-text)", fontWeight: 500 }}>{email || "your email"}</span>
      </p>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <InputOTP maxLength={6} value={otp} onChange={setOtp}>
          <InputOTPGroup>
            <InputOTPSlot index={0} className="h-14 w-14 text-xl" />
            <InputOTPSlot index={1} className="h-14 w-14 text-xl" />
            <InputOTPSlot index={2} className="h-14 w-14 text-xl" />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} className="h-14 w-14 text-xl" />
            <InputOTPSlot index={4} className="h-14 w-14 text-xl" />
            <InputOTPSlot index={5} className="h-14 w-14 text-xl" />
          </InputOTPGroup>
        </InputOTP>

        {error && <div style={{ ...s.errorBox, width: "100%", boxSizing: "border-box" as const, marginBottom: 0 }}>{error}</div>}

        <button
          onClick={handleVerify}
          disabled={otp.length !== 6 || loading}
          style={{ ...s.submitBtn(loading || otp.length !== 6), width: "100%", opacity: otp.length !== 6 || loading ? 0.6 : 1 }}
        >
          {loading ? "Verifying…" : "Verify Code"}
        </button>

        <p style={{ fontSize: 13, color: "var(--auth-text-muted)", textAlign: "center" }}>
          Didn&apos;t receive the code?{" "}
          {resendCountdown > 0
            ? <span style={{ color: "var(--auth-link)", fontWeight: 500 }}>Resend in {resendCountdown}s</span>
            : <button onClick={handleResend} disabled={resendLoading}
                style={{ background: "none", border: "none", color: "var(--auth-link)", fontWeight: 500, cursor: "pointer", padding: 0, fontSize: 13 }}>
                {resendLoading ? "Sending…" : "Resend"}
              </button>
          }
        </p>
      </div>

      <p style={s.bottomText}>
        <a href="/login" style={s.linkStyle}>← Back to sign in</a>
      </p>
    </AuthShell>
  )
}
