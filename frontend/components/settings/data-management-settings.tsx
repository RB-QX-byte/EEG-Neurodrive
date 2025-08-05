"use client"

import { SettingsSection } from "./settings-section"
import { SettingsField } from "./settings-field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface DataManagementSettingsProps {
  settings: any
  onSettingsChange: (section: string, updates: any) => void
}

export function DataManagementSettings({ settings, onSettingsChange }: DataManagementSettingsProps) {
  const handleChange = (field: string, value: any) => {
    onSettingsChange('dataManagement', { [field]: value })
  }

  const handleExportData = () => {
    console.log('Exporting data...')
    // Simulate data export
  }

  const handleRunCleanup = () => {
    console.log('Running cleanup...')
    // Simulate cleanup operation
  }

  return (
    <SettingsSection
      title="Data Management"
      description="Configure data retention, backup, and export settings"
    >
      <SettingsField
        label="Data Retention Period"
        description="How long to keep analysis data and results"
      >
        <Select
          value={settings.retention}
          onValueChange={(value) => handleChange('retention', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30d">30 days</SelectItem>
            <SelectItem value="90d">90 days</SelectItem>
            <SelectItem value="1y">1 year</SelectItem>
            <SelectItem value="forever">Forever</SelectItem>
          </SelectContent>
        </Select>
      </SettingsField>

      <SettingsField
        label="Auto Cleanup"
        description="Automatically delete old data based on retention policy"
      >
        <div className="flex items-center space-x-4">
          <Switch
            checked={settings.autoCleanup}
            onCheckedChange={(value) => handleChange('autoCleanup', value)}
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRunCleanup}
            disabled={!settings.autoCleanup}
          >
            Run Cleanup Now
          </Button>
        </div>
      </SettingsField>

      <SettingsField
        label="Backup Enabled"
        description="Automatically backup data to secure storage"
      >
        <div className="flex items-center space-x-4">
          <Switch
            checked={settings.backupEnabled}
            onCheckedChange={(value) => handleChange('backupEnabled', value)}
          />
          <Badge variant={settings.backupEnabled ? "default" : "outline"}>
            {settings.backupEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      </SettingsField>

      <SettingsField
        label="Export Format"
        description="Default format for data exports"
      >
        <Select
          value={settings.exportFormat}
          onValueChange={(value) => handleChange('exportFormat', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="csv">CSV</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="excel">Excel</SelectItem>
            <SelectItem value="pdf">PDF Report</SelectItem>
          </SelectContent>
        </Select>
      </SettingsField>

      <SettingsField
        label="Compression"
        description="Compress exported files to reduce size"
      >
        <Switch
          checked={settings.compressionEnabled}
          onCheckedChange={(value) => handleChange('compressionEnabled', value)}
        />
      </SettingsField>

      <div className="pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Storage Usage</h4>
            <p className="text-sm text-gray-600">Current data storage utilization</p>
          </div>
          <Button variant="outline" onClick={handleExportData}>
            Export All Data
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Used: 2.4 TB</span>
            <span>Available: 1.6 TB</span>
          </div>
          <Progress value={60} className="h-2" />
          <p className="text-xs text-gray-600">
            60% of total storage capacity used
          </p>
        </div>
      </div>
    </SettingsSection>
  )
}