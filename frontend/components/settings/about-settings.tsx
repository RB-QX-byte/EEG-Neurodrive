"use client"

import { SettingsSection } from "./settings-section"
import { SettingsField } from "./settings-field"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CopyButton } from "./copy-button"
import { Separator } from "@/components/ui/separator"

interface AboutSettingsProps {
  systemInfo: any
}

export function AboutSettings({ systemInfo }: AboutSettingsProps) {
  const handleDownloadLogs = () => {
    console.log('Downloading system logs...')
  }

  const handleRunDiagnostics = () => {
    console.log('Running system diagnostics...')
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      healthy: "default",
      warning: "secondary",
      error: "destructive",
      maintenance: "outline"
    }
    
    const colors: Record<string, string> = {
      healthy: "status-healthy",
      warning: "status-warning", 
      error: "status-error",
      maintenance: "status-info"
    }

    return (
      <Badge variant={variants[status] || "outline"} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <SettingsSection
      title="System Information"
      description="View system status, version information, and diagnostic data"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <SettingsField label="Application Version">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-mono">{systemInfo.version}</span>
              <CopyButton value={systemInfo.version} />
            </div>
          </SettingsField>

          <SettingsField label="Build Date">
            <span className="text-sm">{systemInfo.buildDate}</span>
          </SettingsField>

          <SettingsField label="API Version">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-mono">{systemInfo.apiVersion}</span>
              <CopyButton value={systemInfo.apiVersion} />
            </div>
          </SettingsField>

          <SettingsField label="Database Version">
            <span className="text-sm">{systemInfo.databaseVersion}</span>
          </SettingsField>

          <SettingsField label="Model Version">
            <span className="text-sm font-mono">{systemInfo.modelVersion}</span>
          </SettingsField>

          <SettingsField label="System Status">
            {getStatusBadge(systemInfo.status)}
          </SettingsField>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-6">
          <SettingsField label="System Uptime">
            <span className="text-sm">{systemInfo.uptime}</span>
          </SettingsField>

          <SettingsField label="Last Backup">
            <span className="text-sm">{new Date(systemInfo.lastBackup).toLocaleString()}</span>
          </SettingsField>

          <SettingsField label="Total Users">
            <span className="text-sm font-semibold">{systemInfo.totalUsers.toLocaleString()}</span>
          </SettingsField>

          <SettingsField label="Total Analyses">
            <span className="text-sm font-semibold">{systemInfo.totalAnalyses.toLocaleString()}</span>
          </SettingsField>

          <SettingsField label="Storage Used">
            <span className="text-sm">{systemInfo.storageUsed}</span>
          </SettingsField>

          <SettingsField label="Storage Available">
            <span className="text-sm">{systemInfo.storageAvailable}</span>
          </SettingsField>
        </div>

        <Separator />

        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={handleDownloadLogs}>
            Download System Logs
          </Button>
          <Button variant="outline" onClick={handleRunDiagnostics}>
            Run Diagnostics
          </Button>
        </div>

        <div className="text-xs text-gray-600">
          <p>
            EEG Analysis Platform - Advanced neurological data processing and visualization system.
            For technical support, contact your system administrator.
          </p>
        </div>
      </div>
    </SettingsSection>
  )
}