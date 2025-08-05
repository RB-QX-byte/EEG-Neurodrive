"use client"

import { useCallback, useState } from 'react'
import { ArrowUp, FileText, AlertCircle, CheckCircle, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatFileSize } from '@/lib/string-formatters'

interface FileWithPreview extends File {
  id: string
  preview?: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

interface EnhancedDropzoneProps {
  onFilesAccepted: (files: File[]) => void
  maxFiles?: number
  maxSize?: number
  acceptedFormats?: string[]
  disabled?: boolean
}

export function EnhancedDropzone({
  onFilesAccepted,
  maxFiles = 10,
  maxSize = 500 * 1024 * 1024, // 500MB
  acceptedFormats = ['.edf', '.csv', '.txt'],
  disabled = false
}: EnhancedDropzoneProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [fileRejections, setFileRejections] = useState<any[]>([])

  const validateFile = (file: File) => {
    const errors = []
    
    if (file.size > maxSize) {
      errors.push({ message: `File too large. Maximum size is ${formatFileSize(maxSize)}` })
    }
    
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!acceptedFormats.includes(extension)) {
      errors.push({ message: `Invalid file type. Accepted formats: ${acceptedFormats.join(', ')}` })
    }
    
    return errors
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles: File[] = []
    const rejectedFiles: any[] = []

    acceptedFiles.forEach(file => {
      const errors = validateFile(file)
      if (errors.length === 0) {
        validFiles.push(file)
      } else {
        rejectedFiles.push({ file, errors })
      }
    })

    // Handle accepted files
    const newFiles: FileWithPreview[] = validFiles.map(file => 
      Object.assign(file, {
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending' as const,
        progress: 0
      })
    )
    
    setFiles(prev => [...prev, ...newFiles])
    setFileRejections(rejectedFiles)
    onFilesAccepted(validFiles)
  }, [onFilesAccepted, maxSize, acceptedFormats])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragActive(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    
    if (disabled) return
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    onDrop(droppedFiles)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      onDrop(selectedFiles)
    }
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-medical-blue bg-blue-50 scale-105' 
            : disabled 
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-medical-blue hover:bg-gray-50'
          }
        `}
      >
        <input 
          type="file"
          multiple
          accept={acceptedFormats.join(',')}
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
          disabled={disabled}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center space-y-4">
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center
              ${isDragActive 
                ? 'bg-medical-blue text-white' 
                : 'bg-gray-100 text-gray-400'
              }
            `}>
              <ArrowUp className="w-8 h-8" />
            </div>
            {isDragActive ? (
              <div>
                <p className="text-lg font-medium text-medical-blue">Drop files here!</p>
                <p className="text-sm text-gray-600">Release to upload</p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium text-gray-700">
                  Drag & drop EEG files here, or <span className="text-medical-blue">browse</span>
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Supports {acceptedFormats.join(', ')} files up to {formatFileSize(maxSize)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Maximum {maxFiles} files
                </p>
              </div>
            )}
          </div>
        </label>
      </div>

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <div className="space-y-2">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{file.name}</p>
                <p className="text-xs text-red-600">
                  {errors.map((e: any) => e.message).join(', ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File Preview List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Selected Files ({files.length})</h4>
          {files.map((file) => (
            <Card key={file.id} className="p-3">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  {file.status === 'uploading' && (
                    <div className="mt-2">
                      <Progress value={file.progress} className="h-1" />
                      <p className="text-xs text-gray-500 mt-1">{file.progress}% uploaded</p>
                    </div>
                  )}
                  {file.error && (
                    <p className="text-xs text-red-600 mt-1">{file.error}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {file.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeFile(file.id)}
                    disabled={file.status === 'uploading'}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}