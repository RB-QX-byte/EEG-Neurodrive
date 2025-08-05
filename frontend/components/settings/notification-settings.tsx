"use client"

import { SettingsSection } from "./settings-section"
import { SettingsField } from "./settings-field"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

interface NotificationSettingsProps {
  settings: any
  onSettingsChange: (section: string, updates: any) => void
}

export function NotificationSettings({ settings, onSettingsChange }: NotificationSettingsProps) {
  const handleEmailChange = (field: string, value: any) => {
    onSettingsChange('notifications', {
      email: {
        ...settings.email,
        [field]: value
      }
    })
  }

  const handleInAppChange = (field: string, value: any) => {
    onSettingsChange('notifications', {
      inApp: {
        ...settings.inApp,
        [field]: value
      }
    })
  }

  return (
    <SettingsSection
      title="Notification Preferences"
      description="Configure how and when you receive notifications about system events"
    >
      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-4">Email Notifications</h4>
          <div className="space-y-4">
            <SettingsField
              label="Analysis Complete"
              description="Notify when EEG analysis jobs finish processing"
            >
              <Switch
                checked={settings.email.analysisComplete}
                onCheckedChange={(value) => handleEmailChange('analysisComplete', value)}
              />
            </SettingsField>

            <SettingsField
              label="Error Alerts"
              description="Notify when analysis jobs fail or encounter errors"
            >
              <Switch
                checked={settings.email.errorAlerts}
                onCheckedChange={(value) => handleEmailChange('errorAlerts', value)}
              />
            </SettingsField>

            <SettingsField
              label="System Alerts"
              description="Notify about system maintenance and updates"
            >
              <Switch
                checked={settings.email.systemAlerts}
                onCheckedChange={(value) => handleEmailChange('systemAlerts', value)}
              />
            </SettingsField>

            <SettingsField
              label="Report Generation"
              description="Notify when reports are generated and ready for download"
            >
              <Switch
                checked={settings.email.reportGeneration}
                onCheckedChange={(value) => handleEmailChange('reportGeneration', value)}
              />
            </SettingsField>

            <SettingsField
              label="Email Frequency"
              description="How often to send email notifications"
            >
              <Select
                value={settings.email.frequency}
                onValueChange={(value) => handleEmailChange('frequency', value)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="hourly">Hourly Digest</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                  <SelectItem value="weekly">Weekly Digest</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </SettingsField>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-medium mb-4">In-App Notifications</h4>
          <div className="space-y-4">
            <SettingsField
              label="Analysis Complete"
              description="Show in-app notifications when analysis jobs finish"
            >
              <Switch
                checked={settings.inApp.analysisComplete}
                onCheckedChange={(value) => handleInAppChange('analysisComplete', value)}
              />
            </SettingsField>

            <SettingsField
              label="Error Alerts"
              description="Show in-app notifications for errors and failures"
            >
              <Switch
                checked={settings.inApp.errorAlerts}
                onCheckedChange={(value) => handleInAppChange('errorAlerts', value)}
              />
            </SettingsField>

            <SettingsField
              label="System Alerts"
              description="Show in-app notifications for system events"
            >
              <Switch
                checked={settings.inApp.systemAlerts}
                onCheckedChange={(value) => handleInAppChange('systemAlerts', value)}
              />
            </SettingsField>

            <SettingsField
              label="Report Generation"
              description="Show in-app notifications when reports are ready"
            >
              <Switch
                checked={settings.inApp.reportGeneration}
                onCheckedChange={(value) => handleInAppChange('reportGeneration', value)}
              />
            </SettingsField>
          </div>
        </div>
      </div>
    </SettingsSection>
  )
}