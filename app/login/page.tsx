"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/context/AppContext"
import AuthShell, { AuthLogo, authInputStyle, authStyles } from "@/components/AuthShell"

declare global {
  interface Window {
    google?: {
      accounts: { id: { initialize: (config: Record<string, unknown>) => void; renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void; prompt: () => void; } }
    }
  }
}

function useGoogleButton(ref: React.RefObject<HTMLDivElement | null>, onCredential: (token: string) => void) {
  useEffect(() => {
    const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!CLIENT_ID || !ref.current) return
    const init = () => {
      if (!window.google || !ref.current) return
      window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: (r: { credential: string }) => onCredential(r.credential) })
      window.google.accounts.id.renderButton(ref.current, { type: "standard", theme: "outline", size: "large", text: "signin_with", shape: "rectangular", width: ref.current.offsetWidth })
    }
    if (window.google) { init(); return }
    const s = document.createElement("script")
    s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.onload = init
    document.head.appendChild(s)
    return () => { s.onload = null }
  }, [ref, onCredential])
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { login, loginWithGoogle, isAuthenticated, isInitializing } = useApp()

  const [form, setForm] = useState({ email: "", password: "" })
  const [showPwd, setShowPwd] = useState(false)
  const [fieldErr, setFieldErr] = useState<Partial<typeof form>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const googleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isInitializing && isAuthenticated) router.replace("/dashboard")
  }, [isAuthenticated, isInitializing, router])

  const handleGoogleCredential = useCallback(async (idToken: string) => {
    setLoading(true); setError(null)
    try { await loginWithGoogle(idToken); router.push("/dashboard") }
    catch (e: any) { setError(e?.message || "Google sign-in failed") }
    finally { setLoading(false) }
  }, [loginWithGoogle, router])

  useGoogleButton(googleRef, handleGoogleCredential)

  const validate = () => {
    const errs: Partial<typeof form> = {}
    if (!form.email.trim()) errs.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email address"
    if (!form.password.trim()) errs.password = "Password is required"
    setFieldErr(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setError(null)
    if (!validate()) return
    setLoading(true)
    try {
      await login(form.email, form.password)
      router.push("/dashboard")
    } catch (err: any) {
      setError(err?.message || "Invalid email or password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(p => ({ ...p, [field]: value }))
    if (fieldErr[field]) setFieldErr(p => ({ ...p, [field]: undefined }))
    // NOTE: intentionally NOT clearing the global error on change,
    // so the "wrong password" message stays visible while the user edits
  }

  const s = authStyles

  return (
    <AuthShell>
      <AuthLogo />
      <h1 style={s.heading}>Welcome back</h1>
      <p style={s.sub}>Sign in to your garden dashboard</p>

      {error && <div style={s.errorBox}>{error}</div>}

      <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label htmlFor="email" style={{ ...s.label, display: "block", marginBottom: 6 }}>Email address</label>
          <input
            id="email" type="email" value={form.email} placeholder="you@example.com" disabled={loading}
            onChange={e => handleChange("email", e.target.value)}
            style={authInputStyle(!!fieldErr.email)}
            onFocus={e => { e.currentTarget.style.borderColor = "var(--auth-input-focus)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(74,222,128,0.12)" }}
            onBlur={e => { e.currentTarget.style.borderColor = fieldErr.email ? "var(--destructive)" : "var(--auth-input-border)"; e.currentTarget.style.boxShadow = "none" }}
          />
          {fieldErr.email && <p style={s.fieldError}>{fieldErr.email}</p>}
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <label htmlFor="password" style={s.label}>Password</label>
            <a href="/forgot-password" style={{ fontSize: 12, color: "var(--auth-link)", textDecoration: "none" }}>Forgot password?</a>
          </div>
          <div style={{ position: "relative" }}>
            <input
              id="password" type={showPwd ? "text" : "password"} value={form.password} placeholder="••••••••" disabled={loading}
              onChange={e => handleChange("password", e.target.value)}
              style={{ ...authInputStyle(!!fieldErr.password), paddingRight: 50 }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--auth-input-focus)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(74,222,128,0.12)" }}
              onBlur={e => { e.currentTarget.style.borderColor = fieldErr.password ? "var(--destructive)" : "var(--auth-input-border)"; e.currentTarget.style.boxShadow = "none" }}
            />
            <button type="button" onClick={() => setShowPwd(!showPwd)}
              style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--auth-text-muted)", cursor: "pointer" }}>
              <EyeIcon open={showPwd} />
            </button>
          </div>
          {fieldErr.password && <p style={s.fieldError}>{fieldErr.password}</p>}
        </div>

        <button type="submit" disabled={loading} style={s.submitBtn(loading)}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div style={s.divider}>
        <div style={s.divLine} /><span>or continue with</span><div style={s.divLine} />
      </div>

      <div ref={googleRef} style={{ width: "100%", minHeight: 44 }} />

      <p style={s.bottomText}>
        Don&apos;t have an account?{" "}
        <a href="/register" style={s.linkStyle}>Create one</a>
      </p>
    </AuthShell>
  )
}
