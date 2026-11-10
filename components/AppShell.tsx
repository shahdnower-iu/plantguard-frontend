"use client"

// components/AppShell.tsx
// Sits between the layout and all pages.
// Shows LoadingScreen during the first boot, then renders the app.

import { useApp } from "@/context/AppContext"
import LoadingScreen from "@/components/loading/LoadingScreen"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isInitializing } = useApp()

  if (isInitializing) return <LoadingScreen />

  return <>{children}</>
}