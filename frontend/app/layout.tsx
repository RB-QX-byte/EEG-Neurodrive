"use client"

import type React from "react"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Inter } from "next/font/google"
import { Sidebar } from "@/components/layout/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { isAuthenticated, isLoading } = useAuth()
  const pathname = usePathname()

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register']
  const isPublicRoute = publicRoutes.includes(pathname)

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-medical-blue"></div>
      </div>
    )
  }

  // If not authenticated and trying to access protected route, show login
  if (!isAuthenticated && !isPublicRoute) {
    return (
      <div className="min-h-screen">
        {children}
      </div>
    )
  }

  // If authenticated and trying to access public route, show full layout
  // If on public route, show minimal layout
  if (isPublicRoute) {
    return (
      <div className="min-h-screen">
        {children}
      </div>
    )
  }

  // Authenticated user, show full layout with sidebar
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <AppLayout>{children}</AppLayout>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}