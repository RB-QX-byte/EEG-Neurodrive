"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ErrorBoundary } from "@/components/error-boundary"
import { SettingsNavigation } from "@/components/settings/settings-navigation"
import { GeneralSettings } from "@/components/settings/general-settings"
import { AnalysisSettings } from "@/components/settings/analysis-settings"
import { UserProfileSettings } from "@/components/settings/user-profile-settings"
import { NotificationSettings } from "@/components/settings/notification-settings"
import { DataManagementSettings } from "@/components/settings/data-management-settings"
import { SecuritySettings } from "@/components/settings/security-settings"
import { AboutSettings } from "@/components/settings/about-settings"
// Default settings structure
const defaultSettings = {
  general: {
    theme: 'system',
    language: 'en',
    timezone: 'UTC-8',
    defaultDashboardView: 'overview',
    refreshInterval: '30s'
  },
  analysis: {
    defaultModel: 'standard',
    confidenceThreshold: '0.85',
    defaultPriority: 'normal',
    autoProcessing: true,
    channelConfiguration: {
      sampling_rate: 256,
      filter_settings: {
        low_pass: 50.0,
        high_pass: 0.5,
        notch: 60
      }
    }
  },
  user: {
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe',
    email: 'john.doe@example.com',
    role: 'Analyst',
    department: 'Neurology',
    lastLogin: new Date().toISOString()
  },
  notifications: {
    email: {
      analysisComplete: true,
      errorAlerts: true,
      systemAlerts: false,
      reportGeneration: true,
      frequency: 'immediate'
    },
    inApp: {
      analysisComplete: true,
      errorAlerts: true,
      systemAlerts: true,
      reportGeneration: false
    }
  },
  dataManagement: {
    retention: '1year',
    autoCleanup: false,
    backupEnabled: true,
    exportFormat: 'json',
    compressionEnabled: true
  },
  security: {
    sessionTimeout: '30m',
    twoFactorEnabled: false,
    passwordExpiry: '90days',
    loginNotifications: true,
    auditLogging: false,
    apiKeyExpiry: '90d',
    passwordPolicy: {
      minLength: 8,
      requireSpecialChars: true,
      requireNumbers: true
    }
  }
}

const defaultSystemInfo = {
  version: '2.1.4',
  buildDate: '2024-01-10',
  apiVersion: 'v1.2.3',
  databaseVersion: 'PostgreSQL 14.2',
  modelVersion: 'EEG-Net v2.1',
  status: 'healthy',
  uptime: '15 days, 3 hours',
  lastBackup: new Date().toISOString(),
  totalUsers: 1247,
  totalAnalyses: 45892,
  storageUsed: '2.8 TB',
  storageAvailable: '1.2 TB'
}
import { Save, RotateCcw, Download, Upload, CheckCircle, AlertCircle } from 'lucide-react'

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general')
  const [settings, setSettings] = useState(defaultSettings)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSettingsChange = (section: string, updates: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        ...updates
      }
    }))
    setHasUnsavedChanges(true)
    setSaveStatus('idle')
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Saving settings:', settings)
      setHasUnsavedChanges(false)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setSettings(defaultSettings)
    setHasUnsavedChanges(false)
    setSaveStatus('idle')
  }

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = 'eeg-settings.json'
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target?.result as string)
          setSettings(importedSettings)
          setHasUnsavedChanges(true)
        } catch (error) {
          console.error('Error importing settings:', error)
        }
      }
      reader.readAsText(file)
    }
  }

  const renderSettingsContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <GeneralSettings 
            settings={settings.general} 
            onSettingsChange={handleSettingsChange}
          />
        )
      case 'analysis':
        return (
          <AnalysisSettings 
            settings={settings.analysis} 
            onSettingsChange={handleSettingsChange}
          />
        )
      case 'profile':
        return (
          <UserProfileSettings 
            settings={settings.user} 
            onSettingsChange={handleSettingsChange}
          />
        )
      case 'notifications':
        return (
          <NotificationSettings 
            settings={settings.notifications} 
            onSettingsChange={handleSettingsChange}
          />
        )
      case 'data':
        return (
          <DataManagementSettings 
            settings={settings.dataManagement} 
            onSettingsChange={handleSettingsChange}
          />
        )
      case 'security':
        return (
          <SecuritySettings 
            settings={settings.security} 
            onSettingsChange={handleSettingsChange}
          />
        )
      case 'about':
        return <AboutSettings systemInfo={defaultSystemInfo} />
      default:
        return null
    }
  }

  return (
    <ErrorBoundary>
      <div className="flex h-full bg-white">
        {/* Settings Navigation Sidebar */}
        <SettingsNavigation 
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Header */}
          <div className="border-b bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Configure your EEG analysis platform preferences
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    Unsaved Changes
                  </Badge>
                )}
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportSettings}
                    className="hidden"
                    id="import-settings"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('import-settings')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportSettings}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    disabled={!hasUnsavedChanges}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges || isSaving}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {saveStatus !== 'idle' && (
            <div className="p-4 bg-white">
              <Alert variant={saveStatus === 'success' ? 'default' : 'destructive'}>
                {saveStatus === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {saveStatus === 'success' 
                    ? 'Settings saved successfully!' 
                    : 'Failed to save settings. Please try again.'
                  }
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Settings Content */}
          <div className="flex-1 overflow-auto p-6 bg-white">
            <div className="max-w-4xl">
              {renderSettingsContent()}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}