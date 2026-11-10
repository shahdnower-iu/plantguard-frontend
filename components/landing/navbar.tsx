"use client"

import Link from "next/link"
import { useState, useEffect, useRef, useCallback } from "react"
import { Leaf, Menu, X } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"

const navLinks = [
  { label: "Features",  href: "#features", id: "features" },
  { label: "Community", href: "#footer",   id: "footer"   },
]

const ALL_SECTIONS = ["hero", "features", "footer"]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeId, setActiveId]     = useState("")
  const [scrolled, setScrolled]     = useState(false)
  const rafRef                      = useRef<number | null>(null)

  const detectSection = useCallback(() => {
    const scrollY      = window.scrollY
    const windowHeight = window.innerHeight
    const docHeight    = document.documentElement.scrollHeight

    setScrolled(scrollY > 10)

    // If user is at (or near) the very bottom → always activate last section
    const atBottom = scrollY + windowHeight >= docHeight - 10
    if (atBottom) {
      setActiveId("footer")
      window.history.replaceState(null, "", "#footer")
      return
    }

    // Otherwise find which section's top is closest above the navbar bottom
    const triggerY = scrollY + 80

    let current = ""
    for (const id of ALL_SECTIONS) {
      const el = document.getElementById(id)
      if (!el) continue
      const sectionTop = el.getBoundingClientRect().top + scrollY
      if (sectionTop <= triggerY) current = id
    }

    if (!current || current === "hero") {
      setActiveId("")
      window.history.replaceState(null, "", location.pathname)
    } else {
      setActiveId(current)
      window.history.replaceState(null, "", `#${current}`)
    }
  }, [])

  const onScroll = useCallback(() => {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      detectSection()
      rafRef.current = null
    })
  }, [detectSection])

  useEffect(() => {
    detectSection()
    window.addEventListener("scroll", onScroll,      { passive: true })
    window.addEventListener("resize", detectSection, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", detectSection)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [onScroll, detectSection])

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-card/90 shadow-sm backdrop-blur-md border-b border-border"
          : "bg-card/60 backdrop-blur-sm border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2"
          onClick={() => { setActiveId(""); setMobileOpen(false) }}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">PlantGuard</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ label, href, id }) => {
            const isActive = activeId === id
            return (
              <Link
                key={id}
                href={href}
                onClick={() => { setActiveId(id); setMobileOpen(false) }}
                className={`relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {label}
                {isActive && (
                  <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                )}
              </Link>
            )
          })}
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">Sign Up</Link>
          </Button>
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-b border-border bg-card px-6 pb-5 md:hidden">
          <div className="flex flex-col gap-1 pt-1">
            {navLinks.map(({ label, href, id }) => {
              const isActive = activeId === id
              return (
                <Link
                  key={id}
                  href={href}
                  onClick={() => { setActiveId(id); setMobileOpen(false) }}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              )
            })}
            <div className="mt-3 flex gap-3 border-t border-border pt-3">
              <Button variant="ghost" size="sm" asChild className="flex-1">
                <Link href="/login">Log In</Link>
              </Button>
              <Button size="sm" asChild className="flex-1">
                <Link href="/register">Sign Up</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}