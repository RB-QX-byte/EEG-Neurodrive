"use client"

import { SettingsSection } from "./settings-section"
import { SettingsField } from "./settings-field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface AnalysisSettingsProps {
  settings: any
  onSettingsChange: (section: string, updates: any) => void
}

export function AnalysisSettings({ settings, onSettingsChange }: AnalysisSettingsProps) {
  const handleChange = (field: string, value: any) => {
    onSettingsChange('analysis', { [field]: value })
  }

  const handleChannelConfigChange = (field: string, value: any) => {
    onSettingsChange('analysis', {
      channelConfiguration: {
        ...settings.channelConfiguration,
        [field]: value
      }
    })
  }

  const handleFilterChange = (field: string, value: any) => {
    onSettingsChange('analysis', {
      channelConfiguration: {
        ...settings.channelConfiguration,
        filter_settings: {
          ...settings.channelConfiguration.filter_settings,
          [field]: value
        }
      }
    })
  }

  return (
    <SettingsSection
      title="Analysis Configuration"
      description="Configure EEG analysis parameters and processing options"
    >
      <SettingsField
        label="Default Model"
        description="Select the machine learning model to use for EEG analysis"
      >
        <Select
          value={settings.defaultModel}
          onValueChange={(value) => handleChange('defaultModel', value)}
        >
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cnn_lstm_model_efficient">CNN-LSTM Efficient (v2.1)</SelectItem>
            <SelectItem value="transformer_model">Transformer Model (v1.8)</SelectItem>
            <SelectItem value="resnet_eeg">ResNet EEG (v1.5)</SelectItem>
            <SelectItem value="custom_model">Custom Model</SelectItem>
          </SelectContent>
        </Select>
      </SettingsField>

      <SettingsField
        label="Confidence Threshold"
        description="Minimum confidence level required for analysis results"
      >
        <Select
          value={settings.confidenceThreshold}
          onValueChange={(value) => handleChange('confidenceThreshold', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low (60%)</SelectItem>
            <SelectItem value="medium">Medium (75%)</SelectItem>
            <SelectItem value="high">High (90%)</SelectItem>
          </SelectContent>
        </Select>
      </SettingsField>

      <SettingsField
        label="Default Priority"
        description="Default priority level for new analysis jobs"
      >
        <Select
          value={settings.defaultPriority}
          onValueChange={(value) => handleChange('defaultPriority', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="routine">Routine</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </SettingsField>

      <SettingsField
        label="Auto Processing"
        description="Automatically start analysis when files are uploaded"
      >
        <Switch
          checked={settings.autoProcessing}
          onCheckedChange={(value) => handleChange('autoProcessing', value)}
        />
      </SettingsField>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="channel-config">
          <AccordionTrigger>Channel Configuration</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <SettingsField
              label="Sampling Rate (Hz)"
              description="Data sampling frequency for EEG recordings"
            >
              <Input
                type="number"
                value={settings.channelConfiguration.sampling_rate}
                onChange={(e) => handleChannelConfigChange('sampling_rate', parseInt(e.target.value))}
                className="w-32"
              />
            </SettingsField>

            <SettingsField
              label="Low Pass Filter (Hz)"
              description="High frequency cutoff for noise reduction"
            >
              <Input
                type="number"
                value={settings.channelConfiguration.filter_settings.low_pass}
                onChange={(e) => handleFilterChange('low_pass', parseFloat(e.target.value))}
                className="w-32"
              />
            </SettingsField>

            <SettingsField
              label="High Pass Filter (Hz)"
              description="Low frequency cutoff for baseline drift removal"
            >
              <Input
                type="number"
                step="0.1"
                value={settings.channelConfiguration.filter_settings.high_pass}
                onChange={(e) => handleFilterChange('high_pass', parseFloat(e.target.value))}
                className="w-32"
              />
            </SettingsField>

            <SettingsField
              label="Notch Filter (Hz)"
              description="Power line interference removal frequency"
            >
              <Input
                type="number"
                value={settings.channelConfiguration.filter_settings.notch}
                onChange={(e) => handleFilterChange('notch', parseInt(e.target.value))}
                className="w-32"
              />
            </SettingsField>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SettingsSection>
  )
}