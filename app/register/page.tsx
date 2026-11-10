"use client"

// app/(auth)/register/page.tsx

import Image from "next/image"
import Link from "next/link"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Leaf, Eye, EyeOff, Mail, Lock, User, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { COUNTRIES_CITIES } from "@/lib/countries-cities"
import { auth } from "@/lib/api"
import { useApp } from "@/context/AppContext"

const ALL_COUNTRIES = Object.keys(COUNTRIES_CITIES).sort()

// Mirrors the same GSI hook used in the login page.
// Renders a "Sign up with Google" button into `ref` and calls
// `onCredential` with the raw ID token when the user picks an account.
function useGoogleButton(
  ref: React.RefObject<HTMLDivElement | null>,
  onCredential: (token: string) => void,
) {
  useEffect(() => {
    const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!CLIENT_ID || !ref.current) return

    const init = () => {
      if (!window.google || !ref.current) return
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (r: { credential: string }) => onCredential(r.credential),
      })
      window.google.accounts.id.renderButton(ref.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "signup_with",   // shows "Sign up with Google"
        shape: "rectangular",
        width: ref.current.offsetWidth,
      })
    }

    if (window.google) { init(); return }

    const s = document.createElement("script")
    s.src = "https://accounts.google.com/gsi/client"
    s.async = true
    s.onload = init
    document.head.appendChild(s)
    return () => { s.onload = null }
  }, [ref, onCredential])
}

export default function RegisterPage() {
  const router = useRouter()
  const { isAuthenticated, isInitializing, loginWithGoogle } = useApp()
  const googleRef = useRef<HTMLDivElement>(null)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState("")
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    country: "", city: "", password: "", confirmPassword: "",
  })

  // Redirect if already logged in
  useEffect(() => {
    if (!isInitializing && isAuthenticated) router.replace("/dashboard")
  }, [isAuthenticated, isInitializing, router])

  const update = (field: keyof typeof formData, value: string) =>
    setFormData((p) => ({ ...p, [field]: value }))

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country)
    update("country", country)
    update("city", "")
  }

  // Called by the GSI button with a real ID token — same flow as login page.
  const handleGoogleCredential = useCallback(async (idToken: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await loginWithGoogle(idToken)
      router.push("/dashboard")
    } catch (e: any) {
      setError(e?.message || "Google sign-up failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [loginWithGoogle, router])

  // Wire up the GSI button
  useGoogleButton(googleRef, handleGoogleCredential)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password.length < 8) { setError("Password must be at least 8 characters."); return }
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match."); return }
    setIsLoading(true)
    setError(null)
    try {
      await auth.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phoneNumber: formData.phone,
        country: formData.country,
        city: formData.city,
      })
      // Store email so verify page knows who to verify
      localStorage.setItem("pending_email", formData.email)
      router.push("/verify")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left image */}
      <div className="relative hidden lg:flex lg:w-[45%]">
        <Image src="/loginPage.jpeg" alt="Plants" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/10" />
        <div className="absolute top-6 left-6 pointer-events-none flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-lg">
            <Leaf className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-white drop-shadow-md">PlantGuard</span>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center px-9 py-3">
        <div className="w-full max-w-md">
          <header className="mb-3">
            <h1 className="font-serif text-xl font-bold text-foreground">Create account</h1>
            <p className="text-[15px] text-muted-foreground">Join the plant protection community</p>
          </header>

          {/* Google sign-up button — rendered by GSI, NOT a redirect */}
          <div ref={googleRef} style={{ width: "100%", minHeight: 44 }} />

          <div className="relative my-2.5">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-background px-3 text-muted-foreground font-medium">Or email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold ml-3">First Name</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="John"
                    className="h-8 pl-10 text-xs rounded-full bg-muted/30 border-border/50"
                    value={formData.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold ml-3">Last Name</Label>
                <Input
                  placeholder="Doe"
                  className="h-8 px-5 text-xs rounded-full bg-muted/30 border-border/50"
                  value={formData.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold ml-3">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="email@link.com"
                    className="h-8 pl-10 text-xs rounded-full bg-muted/30 border-border/50"
                    value={formData.email}
                    onChange={(e) => update("email", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold ml-3">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="+1..."
                    className="h-8 pl-10 text-xs rounded-full bg-muted/30 border-border/50"
                    value={formData.phone}
                    onChange={(e) => update("phone", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold ml-3">Country</Label>
                <Select onValueChange={handleCountryChange} value={formData.country}>
                  <SelectTrigger className="h-8 px-5 text-xs rounded-full bg-muted/30">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="max-h-32">
                    {ALL_COUNTRIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold ml-3">City</Label>
                <Select
                  onValueChange={(v) => update("city", v)}
                  value={formData.city}
                  disabled={!selectedCountry}
                >
                  <SelectTrigger className="h-8 px-5 text-xs rounded-full bg-muted/30">
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent className="max-h-32">
                    {(COUNTRIES_CITIES[selectedCountry] ?? []).map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold ml-3">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    className="h-8 pl-10 pr-10 text-xs rounded-full bg-muted/30"
                    value={formData.password}
                    onChange={(e) => update("password", e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold ml-3">Confirm</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={showConfirm ? "text" : "password"}
                    className="h-8 pl-10 pr-10 text-xs rounded-full bg-muted/30"
                    value={formData.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-[9px] text-destructive text-center font-bold bg-destructive/10 rounded-full py-1">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="mt-1 h-9 w-full text-xs rounded-full font-bold shadow-md"
            >
              {isLoading ? "Please wait..." : "Create Account"}
            </Button>
          </form>

          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Have an account?{" "}
            <Link href="/login" className="font-bold text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}