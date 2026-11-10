/**
 * AuthShell — shared wrapper for all auth pages (login, register, forgot-password, verify, reset).
 *
 * Design intent: auth pages always use the deep-forest dark card on a dark gradient.
 * In dark mode the gradient deepens slightly. The CSS vars --auth-* drive every colour,
 * so flipping the html class is all that's needed — no per-page JS needed.
 */
"use client"

import { Leaf } from "lucide-react"

function LeafPattern() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 500 800"
      fill="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.07, pointerEvents: "none" }}
    >
      <path d="M-40 600 Q80 400 200 500 Q120 650 -40 600Z" fill="var(--auth-link)" />
      <path d="M420 100 Q500 300 380 400 Q300 280 420 100Z" fill="var(--auth-link)" />
      <path d="M60 100 Q160 -20 240 80 Q180 200 60 100Z" fill="var(--auth-text-muted)" />
      <path d="M350 650 Q480 580 500 700 Q420 780 350 650Z" fill="var(--auth-text-muted)" />
      <path d="M-40 600 Q80 520 200 500" stroke="var(--auth-link)" strokeWidth="1" />
      <path d="M420 100 Q460 250 380 400" stroke="var(--auth-link)" strokeWidth="1" />
      {[[80,350],[160,680],[400,230],[300,740],[480,500],[20,200],[240,120],[450,650]].map(([cx,cy],i) => (
        <circle key={i} cx={cx} cy={cy} r="3" fill="var(--auth-link)" />
      ))}
    </svg>
  )
}

export function AuthLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: "rgba(22,101,52,0.9)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 0 1px rgba(74,222,128,0.3)",
      }}>
        <Leaf size={18} color="var(--auth-link)" />
      </div>
      <span style={{
        fontFamily: '"Cormorant Garamond", Georgia, serif',
        fontSize: 22, fontWeight: 700,
        color: "var(--auth-text)",
        letterSpacing: "-0.3px",
      }}>
        PlantGuard
      </span>
    </div>
  )
}

/** Shared input style — call as a function so React re-reads vars each render */
export function authInputStyle(hasError = false): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 14px",
    background: "var(--auth-input-bg)",
    border: `1px solid ${hasError ? "var(--destructive)" : "var(--auth-input-border)"}`,
    borderRadius: 10,
    color: "var(--auth-text)",
    fontSize: 15,
    outline: "none",
    transition: "border-color 0.18s, box-shadow 0.18s",
    fontFamily: '"DM Sans", system-ui, sans-serif',
  }
}

export const authStyles = {
  heading: {
    fontFamily: '"Cormorant Garamond", Georgia, serif',
    fontSize: 28, fontWeight: 700,
    color: "var(--auth-text)",
    margin: "0 0 6px", lineHeight: 1.25,
  } as React.CSSProperties,

  sub: {
    fontSize: 14,
    color: "var(--auth-text-muted)",
    margin: "0 0 28px",
  } as React.CSSProperties,

  label: {
    fontSize: 13, fontWeight: 500,
    color: "var(--auth-label)",
    letterSpacing: "0.02em",
  } as React.CSSProperties,

  submitBtn: (loading = false): React.CSSProperties => ({
    width: "100%", padding: "13px",
    background: loading ? "rgba(22,163,74,0.6)" : "var(--auth-btn-bg)",
    border: "none", borderRadius: 10,
    color: "var(--auth-btn-text)",
    fontSize: 15, fontWeight: 600,
    cursor: loading ? "not-allowed" : "pointer",
    transition: "background 0.18s",
    fontFamily: '"DM Sans", system-ui, sans-serif',
  }),

  errorBox: {
    padding: "10px 14px",
    background: "var(--auth-error-bg)",
    border: "1px solid var(--auth-error-border)",
    borderRadius: 10,
    color: "var(--auth-error-text)",
    fontSize: 13, marginBottom: 20,
  } as React.CSSProperties,

  fieldError: {
    fontSize: 12, color: "var(--auth-error-text)", marginTop: 4,
  } as React.CSSProperties,

  divider: {
    display: "flex", alignItems: "center",
    gap: 12, margin: "24px 0",
    color: "var(--auth-divider)",
    fontSize: 12, letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },

  divLine: {
    flex: 1, height: 1,
    background: "var(--auth-divider-line)",
  } as React.CSSProperties,

  linkStyle: {
    color: "var(--auth-link)", textDecoration: "none", fontWeight: 500,
  } as React.CSSProperties,

  bottomText: {
    textAlign: "center" as const,
    fontSize: 14, color: "var(--auth-text-muted)", marginTop: 24,
  } as React.CSSProperties,
}

interface AuthShellProps {
  children: React.ReactNode
}

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, var(--auth-bg-from) 0%, var(--auth-bg-mid) 45%, var(--auth-bg-to) 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
      position: "relative",
      overflow: "hidden",
      fontFamily: '"DM Sans", system-ui, sans-serif',
    }}>
      <LeafPattern />
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 420,
        background: "var(--auth-card-bg)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid var(--auth-card-border)",
        borderRadius: 20,
        padding: "40px 36px 36px",
        boxShadow: "0 32px 64px rgba(0,0,0,0.45)",
      }}>
        {children}
      </div>
    </div>
  )
}
