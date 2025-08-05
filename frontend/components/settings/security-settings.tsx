"use client"

import { SettingsSection } from "./settings-section"
import { SettingsField } from "./settings-field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CopyButton } from "./copy-button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface SecuritySettingsProps {
  settings: any
  onSettingsChange: (section: string, updates: any) => void
}

export function SecuritySettings({ settings, onSettingsChange }: SecuritySettingsProps) {
  const handleChange = (field: string, value: any) => {
    onSettingsChange('security', { [field]: value })
  }

  const handlePasswordPolicyChange = (field: string, value: any) => {
    onSettingsChange('security', {
      passwordPolicy: {
        ...settings.passwordPolicy,
        [field]: value
      }
    })
  }

  const generateApiKey = () => {
    // Simulate API key generation
    const newKey = 'eeg_' + Math.random().toString(36).substr(2, 32)
    console.log('Generated new API key:', newKey)
  }

  return (
    <SettingsSection
      title="Security Settings"
      description="Manage your account security and authentication preferences"
    >
      <SettingsField
        label="Session Timeout"
        description="Automatically log out after period of inactivity"
      >
        <Select
          value={settings.sessionTimeout}
          onValueChange={(value) => handleChange('sessionTimeout', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15m">15 minutes</SelectItem>
            <SelectItem value="30m">30 minutes</SelectItem>
            <SelectItem value="1h">1 hour</SelectItem>
            <SelectItem value="4h">4 hours</SelectItem>
            <SelectItem value="8h">8 hours</SelectItem>
            <SelectItem value="never">Never</SelectItem>
          </SelectContent>
        </Select>
      </SettingsField>

      <SettingsField
        label="Two-Factor Authentication"
        description="Add an extra layer of security to your account"
      >
        <div className="flex items-center space-x-4">
          <Switch
            checked={settings.twoFactorEnabled}
            onCheckedChange={(value) => handleChange('twoFactorEnabled', value)}
          />
          <Badge variant={settings.twoFactorEnabled ? "default" : "outline"}>
            {settings.twoFactorEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      </SettingsField>

      <SettingsField
        label="Audit Logging"
        description="Log all user actions for security monitoring"
      >
        <Switch
          checked={settings.auditLogging}
          onCheckedChange={(value) => handleChange('auditLogging', value)}
        />
      </SettingsField>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="password-policy">
          <AccordionTrigger>Password Policy</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <SettingsField
              label="Minimum Length"
              description="Minimum number of characters required"
            >
              <Input
                type="number"
                min="6"
                max="32"
                value={settings.passwordPolicy.minLength}
                onChange={(e) => handlePasswordPolicyChange('minLength', parseInt(e.target.value))}
                className="w-32"
              />
            </SettingsField>

            <SettingsField
              label="Require Special Characters"
              description="Password must contain special characters (!@#$%^&*)"
            >
              <Switch
                checked={settings.passwordPolicy.requireSpecialChars}
                onCheckedChange={(value) => handlePasswordPolicyChange('requireSpecialChars', value)}
              />
            </SettingsField>

            <SettingsField
              label="Require Numbers"
              description="Password must contain at least one number"
            >
              <Switch
                checked={settings.passwordPolicy.requireNumbers}
                onCheckedChange={(value) => handlePasswordPolicyChange('requireNumbers', value)}
              />
            </SettingsField>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="api-keys">
          <AccordionTrigger>API Key Management</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <SettingsField
              label="API Key Expiry"
              description="How long API keys remain valid"
            >
              <Select
                value={settings.apiKeyExpiry}
                onValueChange={(value) => handleChange('apiKeyExpiry', value)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30d">30 days</SelectItem>
                  <SelectItem value="90d">90 days</SelectItem>
                  <SelectItem value="1y">1 year</SelectItem>
                  <SelectItem value="never">Never expire</SelectItem>
                </SelectContent>
              </Select>
            </SettingsField>

            <SettingsField
              label="Current API Key"
              description="Your current API key for programmatic access"
            >
              <div className="flex items-center space-x-2">
                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  eeg_***************************
                </code>
                <CopyButton value="eeg_sample_api_key_placeholder" />
                <Button variant="outline" size="sm" onClick={generateApiKey}>
                  Regenerate
                </Button>
              </div>
            </SettingsField>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SettingsSection>
  )
}