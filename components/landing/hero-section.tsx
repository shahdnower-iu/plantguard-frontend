import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"

const stats = [
  { value: "98%",  label: "Accuracy Rate"     },
  { value: "90K+",  label: "Database"  },
  { value: "24/7", label: "Expert Support"    },
]

export function HeroSection() {
  return (
    <section id="hero" className="relative min-h-[88vh] overflow-hidden pt-16">

      {/* Full-bleed background image */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/hero-plants.jpg"
          alt="Beautiful indoor plant collection"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Left-side fade — white on light mode, card on dark */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/10" />
        {/* Subtle bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Content */}
      <div className="relative mx-auto flex max-w-7xl flex-col justify-center px-6 py-20 lg:py-28">
        <div className="max-w-xl">

          {/* Badge */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1.5">
            <Leaf className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold tracking-wide text-primary">AI Insight for Your Growing World</span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-4xl font-bold leading-[1.15] text-foreground sm:text-5xl lg:text-[3.5rem]">
            Keep Your Plants
            <br />
            <span className="text-primary">Healthy &amp; Thriving</span>
          </h1>

          {/* Subtext */}
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Detect plant diseases instantly with advanced AI. Get personalised care recommendations so your green friends always thrive.
          </p>

          {/* CTAs */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button size="lg" asChild className="gap-2 shadow-sm">
              <Link href="/register">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="bg-background/60 backdrop-blur-sm">
              <Link href="#features">View Demo</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-10 flex items-center gap-6">
            {stats.map((s, i) => (
              <div key={s.label} className="flex items-center gap-6">
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
                {i < stats.length - 1 && <div className="h-8 w-px bg-border" />}
              </div>
            ))}
          </div>
        </div>

        
         
        
      </div>

    </section>
  )
}
