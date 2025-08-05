"use client"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface SettingsFieldProps {
  label: string
  description?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function SettingsField({ 
  label, 
  description, 
  required = false, 
  children, 
  className 
}: SettingsFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="space-y-1">
        <Label className="text-sm font-medium text-gray-900">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {description && (
          <p className="text-xs text-gray-600">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}