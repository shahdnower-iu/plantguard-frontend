"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import AuthShell, { AuthLogo, authInputStyle, authStyles } from "@/components/AuthShell"

export default function ForgotPassword() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError("")
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    try {
      const res = await fetch(`${apiBase}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem("reset_email", email)
        setSuccess(true)
        setTimeout(() => router.push("/verify"), 1500)
      } else {
        setError(data.message || "Something went wrong")
      }
    } catch {
      setError("Network error — make sure the server is running")
    } finally {
      setLoading(false)
    }
  }

  const s = authStyles

  if (success) {
    return (
      <AuthShell>
        <AuthLogo />
        <h1 style={s.heading}>Check your email</h1>
        <p style={s.sub}>We&apos;ve sent a 6-digit code to <strong style={{ color: "var(--auth-text)" }}>{email}</strong></p>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <AuthLogo />
      <h1 style={s.heading}>Forgot password?</h1>
      <p style={s.sub}>Enter your email to receive a reset code</p>

      {error && <div style={s.errorBox}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label htmlFor="email" style={{ ...s.label, display: "block", marginBottom: 6 }}>Email address</label>
          <input
            id="email" type="email" value={email} placeholder="you@example.com"
            disabled={loading} onChange={e => setEmail(e.target.value)}
            style={authInputStyle()}
            onFocus={e => { e.currentTarget.style.borderColor = "var(--auth-input-focus)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(74,222,128,0.12)" }}
            onBlur={e => { e.currentTarget.style.borderColor = "var(--auth-input-border)"; e.currentTarget.style.boxShadow = "none" }}
          />
        </div>
        <button type="submit" disabled={loading} style={s.submitBtn(loading)}>
          {loading ? "Sending code…" : "Send reset code"}
        </button>
      </form>

      <p style={s.bottomText}>
        <a href="/login" style={s.linkStyle}>← Back to sign in</a>
      </p>
    </AuthShell>
  )
}
