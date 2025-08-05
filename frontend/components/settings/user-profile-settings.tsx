"use client"

import { useState } from "react"
import { SettingsSection } from "./settings-section"
import { SettingsField } from "./settings-field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CopyButton } from "./copy-button"
import { formatSafeDate } from "@/lib/date-utils"

interface UserProfileSettingsProps {
  settings: any
  onSettingsChange: (section: string, updates: any) => void
}

export function UserProfileSettings({ settings, onSettingsChange }: UserProfileSettingsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState(settings)

  const handleChange = (field: string, value: any) => {
    setEditedUser({ ...editedUser, [field]: value })
  }

  const handleSave = () => {
    onSettingsChange('user', editedUser)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedUser(settings)
    setIsEditing(false)
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isEmailValid = validateEmail(editedUser.email)

  return (
    <SettingsSection
      title="User Profile"
      description="Manage your account information and personal details"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <SettingsField
            label="First Name"
            required
          >
            {isEditing ? (
              <Input
                value={editedUser.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="Enter first name"
              />
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-sm">{settings.firstName}</span>
              </div>
            )}
          </SettingsField>

          <SettingsField
            label="Last Name"
            required
          >
            {isEditing ? (
              <Input
                value={editedUser.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Enter last name"
              />
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-sm">{settings.lastName}</span>
              </div>
            )}
          </SettingsField>
        </div>

        <SettingsField
          label="Username"
          description="Your unique identifier in the system"
        >
          <div className="flex items-center space-x-2">
            <span className="text-sm font-mono">{settings.username}</span>
            <CopyButton value={settings.username} />
          </div>
        </SettingsField>

        <SettingsField
          label="Email Address"
          description="Your email address for notifications and account recovery"
          required
        >
          {isEditing ? (
            <div className="space-y-2">
              <Input
                type="email"
                value={editedUser.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Enter email address"
                className={!isEmailValid && editedUser.email ? 'border-red-500' : ''}
              />
              {!isEmailValid && editedUser.email && (
                <p className="text-xs form-error">Please enter a valid email address</p>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-sm">{settings.email}</span>
              <CopyButton value={settings.email} />
            </div>
          )}
        </SettingsField>

        <SettingsField
          label="Role"
          description="Your role and permissions in the system"
        >
          <Badge variant="outline" className="w-fit">
            {settings.role}
          </Badge>
        </SettingsField>

        <SettingsField
          label="Department"
        >
          {isEditing ? (
            <Input
              value={editedUser.department}
              onChange={(e) => handleChange('department', e.target.value)}
              placeholder="Enter department"
            />
          ) : (
            <span className="text-sm">{settings.department}</span>
          )}
        </SettingsField>

        <SettingsField
          label="Last Login"
          description="When you last accessed the system"
        >
          <span className="text-sm text-gray-600">
            {formatSafeDate(settings.lastLogin)}
          </span>
        </SettingsField>

        <div className="flex items-center space-x-3 pt-4">
          {isEditing ? (
            <>
              <Button 
                onClick={handleSave}
                disabled={!editedUser.firstName || !editedUser.lastName || !isEmailValid}
              >
                Save Changes
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          )}
        </div>
      </div>
    </SettingsSection>
  )
}