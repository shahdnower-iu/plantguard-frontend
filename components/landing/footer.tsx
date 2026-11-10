"use client"

import Link from "next/link"
import { Leaf, Twitter, Github, Instagram } from "lucide-react"

const links = {
  Product: [
    { label: "Disease Detection", href: "#" },
    { label: "Plant Library", href: "#" },
    { label: "Scan History", href: "#" },
    { label: "Pro Plan", href: "#" },
  ],
  Company: [
    { label: "About Us", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
}

const stats = [
  { value: "120K+", label: "Plants scanned" },
  { value: "4.9★", label: "App rating" },
  { value: "38K+", label: "Happy gardeners" },
]

export function Footer() {
  return (
    <footer  id="footer" className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* Top grid */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">

          {/* Brand col — spans 2 */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
                <Leaf className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">PlantGuard</span>
            </Link>

            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              AI-powered plant disease detection helping gardeners and farmers keep their plants healthy — one scan at a time.
            </p>

            {/* Fake stats */}
            <div className="mt-6 flex gap-6">
              {stats.map(({ value, label }) => (
                <div key={label}>
                  <p className="text-base font-semibold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {section}
              </p>
              <ul className="flex flex-col gap-2.5">
                {items.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} PlantGuard. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Made with</span>
            <Leaf className="h-3.5 w-3.5 text-primary" />
            <span>for plant lovers everywhere</span>
          </div>
        </div>

      </div>
    </footer>
  )
}