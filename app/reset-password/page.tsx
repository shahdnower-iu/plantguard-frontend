"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AuthShell, { AuthLogo, authInputStyle, authStyles } from "@/components/AuthShell"

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export default function ResetPassword() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [otp, setOtp]     = useState("")
  const [password, setPassword]           = useState("")
  const [confirmPassword, setConfirm]     = useState("")
  const [showPwd, setShowPwd]             = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState("")

  useEffect(() => {
    const storedEmail = localStorage.getItem("reset_email") ?? ""
    const storedOtp   = localStorage.getItem("reset_otp")   ?? ""
    if (!storedEmail || !storedOtp) { router.replace("/forgot-password"); return }
    setEmail(storedEmail); setOtp(storedOtp)
  }, [router])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) { setError("Passwords don't match"); return }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return }
    setLoading(true); setError("")
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset-password`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ email, otp, newPassword: password }),
      })
      if (res.ok) {
        localStorage.removeItem("reset_email"); localStorage.removeItem("reset_otp")
        router.push("/login?reset=success")
      } else {
        const data = await res.json()
        setError(data.message ?? "Failed to reset password")
      }
    } catch { setError("Failed to reset password. Please try again.") }
    finally { setLoading(false) }
  }

  const s = authStyles
  const mismatch = !!confirmPassword && password !== confirmPassword
  const eyeBtn: React.CSSProperties = {
    position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", color: "var(--auth-text-muted)", cursor: "pointer", padding: 0, display: "flex",
  }

  return (
    <AuthShell>
      <AuthLogo />
      <h1 style={s.heading}>Set new password</h1>
      <p style={s.sub}>Choose a strong password for your account</p>

      {error && <div style={s.errorBox}>{error}</div>}

      <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label style={{ ...s.label, display: "block", marginBottom: 6 }}>New password</label>
          <div style={{ position: "relative" }}>
            <input type={showPwd ? "text" : "password"} value={password} placeholder="Min. 8 characters"
              autoComplete="new-password" disabled={loading} onChange={e => setPassword(e.target.value)}
              style={{ ...authInputStyle(), paddingRight: 44 }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--auth-input-focus)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(74,222,128,0.12)" }}
              onBlur={e => { e.currentTarget.style.borderColor = "var(--auth-input-border)"; e.currentTarget.style.boxShadow = "none" }}
            />
            <button type="button" onClick={() => setShowPwd(p => !p)} style={eyeBtn}><EyeIcon open={showPwd} /></button>
          </div>
        </div>

        <div>
          <label style={{ ...s.label, display: "block", marginBottom: 6 }}>Confirm password</label>
          <div style={{ position: "relative" }}>
            <input type={showConfirm ? "text" : "password"} value={confirmPassword} placeholder="Repeat your password"
              autoComplete="new-password" disabled={loading} onChange={e => setConfirm(e.target.value)}
              style={{ ...authInputStyle(mismatch), paddingRight: 44 }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--auth-input-focus)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(74,222,128,0.12)" }}
              onBlur={e => { e.currentTarget.style.borderColor = mismatch ? "var(--destructive)" : "var(--auth-input-border)"; e.currentTarget.style.boxShadow = "none" }}
            />
            <button type="button" onClick={() => setShowConfirm(p => !p)} style={eyeBtn}><EyeIcon open={showConfirm} /></button>
          </div>
          {mismatch && <p style={s.fieldError}>Passwords don&apos;t match</p>}
        </div>

        <button type="submit" disabled={loading} style={s.submitBtn(loading)}>
          {loading ? "Resetting…" : "Reset Password"}
        </button>
      </form>

      <p style={s.bottomText}>
        <a href="/login" style={s.linkStyle}>← Back to sign in</a>
      </p>
    </AuthShell>
  )
}
