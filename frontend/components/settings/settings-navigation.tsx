"use client"

import { cn } from "@/lib/utils"
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Monitor,
  Info 
} from "lucide-react"

interface SettingsNavigationProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

const navigationItems = [
  {
    id: 'general',
    label: 'General',
    icon: Settings,
    description: 'Theme, language, and display preferences'
  },
  {
    id: 'analysis',
    label: 'Analysis',
    icon: Monitor,
    description: 'EEG processing and model configuration'
  },
  {
    id: 'profile',
    label: 'User Profile',
    icon: User,
    description: 'Account information and personal details'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Email and in-app notification preferences'
  },
  {
    id: 'data',
    label: 'Data Management',
    icon: Database,
    description: 'Storage, retention, and backup settings'
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    description: 'Password, session, and authentication settings'
  },
  {
    id: 'about',
    label: 'About',
    icon: Info,
    description: 'System information and diagnostics'
  }
]

export function SettingsNavigation({ 
  activeSection, 
  onSectionChange 
}: SettingsNavigationProps) {
  return (
    <div className="w-64 border-r bg-gray-50 p-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Settings</h2>
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-colors",
                "flex items-start space-x-3 hover:bg-gray-100",
                isActive 
                  ? "bg-blue-50 text-blue-700 border border-blue-200" 
                  : "text-gray-700 hover:text-gray-900"
              )}
            >
              <Icon className={cn(
                "w-4 h-4 mt-0.5 flex-shrink-0",
                isActive ? "text-blue-600" : "text-gray-500"
              )} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{item.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {item.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}