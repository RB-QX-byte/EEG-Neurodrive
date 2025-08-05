"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { QueueProvider } from "@/lib/queue-context"
import { AuthProvider } from "@/lib/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import QueuePage from "./queue/page"



export default function QueueNotificationPreview() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <QueueProvider>
          <div className="flex h-screen bg-gray-50">
            <Sidebar 
              collapsed={sidebarCollapsed} 
              onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
            />
            <main className="flex-1 overflow-auto">
              <div className="p-6">
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                      Queue Notification System Demo
                    </h1>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• The sidebar shows a notification badge with the count of unviewed completed analyses</li>
                          <li>• Click the eye icon (👁️) next to completed analyses to mark them as viewed</li>
                          <li>• The notification count decreases when analyses are marked as viewed</li>
                          <li>• Viewed status is persisted in localStorage</li>
                          <li>• The count refreshes automatically every 30 seconds</li>
                        </ul>
                      </div>
                      
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h3 className="font-semibold text-green-900 mb-2">Features implemented:</h3>
                        <ul className="text-sm text-green-800 space-y-1">
                          <li>✅ Dynamic notification count based on unviewed completed analyses</li>
                          <li>✅ Mark analyses as viewed functionality</li>
                          <li>✅ Persistent viewed state using localStorage</li>
                          <li>✅ Visual indicators for viewed vs unviewed items</li>
                          <li>✅ Automatic count refresh</li>
                          <li>✅ Context-based state management</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <QueuePage />
                </div>
              </div>
            </main>
          </div>
        </QueueProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}