import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { AppProvider } from "@/context/AppContext"
import AppShell from "@/components/AppShell"
import "./globals.css"
import { GoogleOAuthProvider } from "@react-oauth/google"

export const metadata: Metadata = {
  title: " PlantGuard ",
  description: "Detect plant diseases instantly with AI-powered analysis.",
  icons: {
    icon: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning={true}>
        <ThemeProvider>
          <AppProvider>
            <AppShell>
              <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
                {children}
              </GoogleOAuthProvider>
            </AppShell>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
