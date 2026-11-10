"use client"

// components/LoadingScreen.tsx
// Full-screen loading shown ONLY once — during the initial app boot.
// After AppContext finishes initializing, this unmounts forever.

import { useEffect, useState } from "react"

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState(0)

  const phases = ["Waking up your garden…", "Fetching your plants…", "Almost ready…"]

  useEffect(() => {
    // Animate progress bar
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 95) { clearInterval(interval); return 95 }
        return p + Math.random() * 12
      })
    }, 200)

    // Cycle through text phases
    const t1 = setTimeout(() => setPhase(1), 800)
    const t2 = setTimeout(() => setPhase(2), 1800)

    return () => { clearInterval(interval); clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div style={styles.root}>
      {/* Ambient background blobs */}
      <div style={{ ...styles.blob, ...styles.blob1 }} />
      <div style={{ ...styles.blob, ...styles.blob2 }} />
      <div style={{ ...styles.blob, ...styles.blob3 }} />

      {/* Noise grain overlay */}
      <div style={styles.grain} />

      <div style={styles.center}>
        {/* Logo mark */}
        <div style={styles.logoWrap}>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={styles.logoSvg}>
            {/* Leaf shape */}
            <path
              d="M28 8C28 8 10 16 10 30C10 40.493 18.059 49 28 49C37.941 49 46 40.493 46 30C46 16 28 8 28 8Z"
              fill="url(#leafGrad)"
            />
            {/* Center vein */}
            <path
              d="M28 48V22"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Side veins */}
            <path
              d="M28 32 L20 26M28 38 L22 33M28 38 L34 33M28 32 L36 26"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="leafGrad" x1="28" y1="8" x2="28" y2="49" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
            </defs>
          </svg>
          <div style={styles.logoGlow} />
        </div>

        {/* Brand name */}
        <h1 style={styles.brand}>PlantGuard</h1>
        <p style={styles.tagline}>Your AI plant companion</p>

        {/* Animated leaf row */}
        <div style={styles.leafRow}>
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              style={{
                ...styles.leafDot,
                animationDelay: `${i * 0.15}s`,
                opacity: Math.min(1, progress / 20 + i * 0.1),
              }}
            />
          ))}
        </div>

        {/* Progress track */}
        <div style={styles.trackWrap}>
          <div style={styles.track}>
            <div style={{ ...styles.fill, width: `${Math.min(progress, 100)}%` }} />
          </div>
          <p style={styles.phaseText}>{phases[phase]}</p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=DM+Sans:wght@300;400&display=swap');

        @keyframes blobFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(30px, -40px) scale(1.08); }
          66%       { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes leafBounce {
          0%, 80%, 100% { transform: scaleY(1); }
          40%           { transform: scaleY(1.6); }
        }
        @keyframes fillShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes logoSpin {
          from { transform: rotate(-8deg) scale(0.8); opacity: 0; }
          to   { transform: rotate(0deg)  scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "fixed", inset: 0, zIndex: 9999,
    background: "#1a6733",
    display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden",
    fontFamily: "'DM Sans', sans-serif",
  },

  // Ambient blobs
  blob: {
    position: "absolute", borderRadius: "50%",
    filter: "blur(80px)", opacity: 0.25,
    animation: "blobFloat 8s ease-in-out infinite",
  },
  blob1: {
    width: 420, height: 420, top: "-10%", left: "-5%",
    background: "radial-gradient(circle, #22c55e, transparent 70%)",
    animationDuration: "9s",
  },
  blob2: {
    width: 300, height: 300, bottom: "5%", right: "10%",
    background: "radial-gradient(circle, #3ccf72, transparent 70%)",
    animationDuration: "11s", animationDelay: "-3s",
  },
  blob3: {
    width: 200, height: 200, top: "40%", right: "-5%",
    background: "radial-gradient(circle, #4ade80, transparent 70%)",
    animationDuration: "7s", animationDelay: "-5s",
  },

  // Grain
  grain: {
    position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.04,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
    backgroundSize: "128px 128px",
  },

  // Center content
  center: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
    animation: "fadeUp 0.6s ease both",
  },

  // Logo
  logoWrap: {
    position: "relative", width: 80, height: 80,
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  logoSvg: {
    animation: "logoSpin 0.7s cubic-bezier(0.34,1.56,0.64,1) both",
    filter: "drop-shadow(0 0 20px rgba(74,222,128,0.5))",
  },
  logoGlow: {
    position: "absolute", inset: -12, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(74,222,128,0.15), transparent 70%)",
    pointerEvents: "none",
  },

  // Text
  brand: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 38, fontWeight: 600, letterSpacing: "-0.5px",
    color: "#f0fdf4", margin: 0, lineHeight: 1,
    animation: "fadeUp 0.6s 0.15s ease both", opacity: 0,
    animationFillMode: "forwards",
  },
  tagline: {
    fontSize: 13, fontWeight: 300, letterSpacing: "0.12em",
    color: "rgba(187,247,208,0.5)", textTransform: "uppercase",
    margin: "8px 0 32px",
    animation: "fadeUp 0.6s 0.25s ease both", opacity: 0,
    animationFillMode: "forwards",
  },

  // Leaf dots
  leafRow: {
    display: "flex", gap: 8, marginBottom: 28,
    animation: "fadeUp 0.6s 0.35s ease both", opacity: 0,
    animationFillMode: "forwards",
  },
  leafDot: {
    width: 8, height: 14, borderRadius: 999,
    background: "linear-gradient(180deg, #4ade80, #16a34a)",
    animation: "leafBounce 1.2s ease-in-out infinite",
    transition: "opacity 0.4s",
  },

  // Progress
  trackWrap: {
    width: 220, display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    animation: "fadeUp 0.6s 0.4s ease both", opacity: 0,
    animationFillMode: "forwards",
  },
  track: {
    width: "100%", height: 3, borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  fill: {
    height: "100%", borderRadius: 999,
    background: "linear-gradient(90deg, #359156, #4ade80, #86efac, #4ade80, #16a34a)",
    backgroundSize: "200% auto",
    animation: "fillShimmer 1.5s linear infinite",
    transition: "width 0.3s ease",
  },
  phaseText: {
    fontSize: 12, color: "rgba(187,247,208,0.45)",
    letterSpacing: "0.06em", margin: 0,
    fontWeight: 300,
  },
}