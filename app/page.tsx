import { Navbar }          from "@/components/landing/navbar"
import { HeroSection }     from "@/components/landing/hero-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { Footer }          from "@/components/landing/footer"

export default function LandingPage() {
  return (
    <main>
      <Navbar />

      {/* id="hero" lets the navbar know we're at the top → no link highlighted */}
      <div id="hero">
        <HeroSection />
      </div>

      {/* id="features" → Features link highlights */}
      <div id="features">
        <FeaturesSection />
      </div>

      {/* id="footer" on the footer element itself → Community link highlights */}
      <Footer />
    </main>
  )
}