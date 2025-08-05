"use client"

import { useState } from "react"
import { SettingsSection } from "./settings-section"
import { SettingsField } from "./settings-field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ThemeToggle } from "@/components/theme-toggle"
import { formatThemeMode, formatRefreshInterval } from "@/lib/settings-formatters"

interface GeneralSettingsProps {
  settings: any
  onSettingsChange: (section: string, updates: any) => void
}

export function GeneralSettings({ settings, onSettingsChange }: GeneralSettingsProps) {
  const handleChange = (field: string, value: any) => {
    onSettingsChange('general', { [field]: value })
  }

  return (
    <SettingsSection
      title="General Settings"
      description="Configure basic application preferences and display options"
    >
      <SettingsField
        label="Theme"
        description="Choose your preferred color scheme"
      >
        <div className="flex items-center space-x-4">
          <Select
            value={settings.theme}
            onValueChange={(value) => handleChange('theme', value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <ThemeToggle />
        </div>
      </SettingsField>

      <SettingsField
        label="Language"
        description="Select your preferred language for the interface"
      >
        <Select
          value={settings.language}
          onValueChange={(value) => handleChange('language', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Spanish</SelectItem>
            <SelectItem value="fr">French</SelectItem>
            <SelectItem value="de">German</SelectItem>
          </SelectContent>
        </Select>
      </SettingsField>

      <SettingsField
        label="Timezone"
        description="Your local timezone for displaying dates and times"
      >
        <Select
          value={settings.timezone}
          onValueChange={(value) => handleChange('timezone', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UTC-8">Pacific Time (UTC-8)</SelectItem>
            <SelectItem value="UTC-5">Eastern Time (UTC-5)</SelectItem>
            <SelectItem value="UTC+0">UTC</SelectItem>
            <SelectItem value="UTC+1">Central European Time (UTC+1)</SelectItem>
          </SelectContent>
        </Select>
      </SettingsField>

      <SettingsField
        label="Default Dashboard View"
        description="Choose which view to show when opening the dashboard"
      >
        <Select
          value={settings.defaultDashboardView}
          onValueChange={(value) => handleChange('defaultDashboardView', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overview">Overview</SelectItem>
            <SelectItem value="queue">Analysis Queue</SelectItem>
            <SelectItem value="results">Recent Results</SelectItem>
            <SelectItem value="analytics">Analytics</SelectItem>
          </SelectContent>
        </Select>
      </SettingsField>

      <SettingsField
        label="Auto Refresh Interval"
        description="How often to automatically refresh data on the dashboard"
      >
        <Select
          value={settings.refreshInterval}
          onValueChange={(value) => handleChange('refreshInterval', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="never">Never</SelectItem>
            <SelectItem value="5s">5 seconds</SelectItem>
            <SelectItem value="10s">10 seconds</SelectItem>
            <SelectItem value="30s">30 seconds</SelectItem>
            <SelectItem value="1m">1 minute</SelectItem>
            <SelectItem value="5m">5 minutes</SelectItem>
          </SelectContent>
        </Select>
      </SettingsField>
    </SettingsSection>
  )
}