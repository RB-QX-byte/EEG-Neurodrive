"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, CheckCircle, AlertCircle, X, Eye, FileText, Loader2 } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { uploadAPI, analysisAPI, AnalysisJob } from "@/lib/api"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  status: "uploading" | "uploaded" | "analyzing" | "completed" | "error"
  progress: number
  jobId?: number
  patientId?: string
  priority?: string
  error?: string
}

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [patientId, setPatientId] = useState("")
  const [priority, setPriority] = useState("normal")
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")
  const [predictingFileIds, setPredictingFileIds] = useState<Set<string>>(new Set())
  const router = useRouter()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!patientId.trim()) {
      setError("Please enter a Patient ID before uploading files")
      return
    }

    const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: "uploading",
      progress: 0,
      patientId,
      priority,
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])
    setError("")

    // Upload files to backend
    newFiles.forEach((fileInfo) => {
      const file = acceptedFiles.find(f => f.name === fileInfo.name)
      if (file) {
        uploadFileToBackend(fileInfo.id, file)
      }
    })
  }, [patientId, priority])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/octet-stream": [".edf"],
      "text/csv": [".csv"],
      "text/plain": [".txt"],
    },
    maxSize: 500 * 1024 * 1024, // 500MB
    disabled: isUploading,
  })

  const uploadFileToBackend = async (fileId: string, file: File) => {
    setIsUploading(true)
    
    try {
      // Update progress to show uploading
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, progress: 50, status: "uploading" }
          : f
      ))

      // Upload file
      const uploadResponse = await uploadAPI.uploadFile(file, patientId, priority)
      
      // Update to uploaded status
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { 
              ...f, 
              progress: 100, 
              status: "uploaded", 
              jobId: uploadResponse.job_id 
            }
          : f
      ))

      // Start analysis
      await analysisAPI.startClassification(uploadResponse.filename, patientId, priority)
      
      // Update to analyzing status
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: "analyzing", progress: 0 }
          : f
      ))

    } catch (err: any) {
      let errorMessage = err.message || "Upload failed"
      
      // Handle specific error cases
      if (err.message && err.message.includes("already exists")) {
        errorMessage = `Patient ID '${patientId}' already exists. Please use a unique patient ID or clear the existing records for this patient.`
        setError(errorMessage)
      } else {
        setError(errorMessage)
      }
      
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { 
              ...f, 
              status: "error", 
              error: errorMessage
            }
          : f
      ))
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  const handlePredict = async (file: UploadedFile) => {
    if (!file.jobId) {
      setError("File not uploaded properly, cannot run prediction")
      return
    }

    try {
      setPredictingFileIds(prev => new Set(prev).add(file.id))
      setError("")

      // Use the uploaded file path for prediction
      const filePath = `uploads/${file.name}`
      
      const response = await analysisAPI.predict(filePath, file.patientId || "")
      
      alert(`Prediction started successfully! Job ID: ${response.job_id}. Check the results page for updates.`)
      
    } catch (err: any) {
      setError(err.message || "Failed to start prediction")
      console.error("Prediction error:", err)
    } finally {
      setPredictingFileIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(file.id)
        return newSet
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "uploading":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Uploading
        </Badge>
      case "uploaded":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Uploaded</Badge>
      case "analyzing":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Analyzing
        </Badge>
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        )
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        )
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const completedFiles = uploadedFiles.filter((file) => file.status === "completed")

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-medical-blue to-blue-600 text-white p-6 rounded-lg">
        <div className="flex items-center space-x-3">
          <Upload className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Upload EEG Files</h1>
            <p className="text-blue-100">Upload EEG recordings for AI-powered neurological disorder analysis</p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Patient Information */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
          <CardDescription>
            Enter patient details before uploading files
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="patientId">Patient ID *</Label>
            <Input
              id="patientId"
              type="text"
              placeholder="Enter patient ID (e.g., PT-2024-001)"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              disabled={isUploading}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Analysis Priority</Label>
            <Select value={priority} onValueChange={setPriority} disabled={isUploading}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="routine">Routine</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>File Upload</CardTitle>
          <CardDescription>
            Drag and drop your EEG files or click to browse. Supported formats: EDF, EDF+, CSV, TXT (up to 500MB each)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-medical-blue bg-blue-50"
                : isUploading
                ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                : !patientId.trim()
                ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                : "border-gray-300 hover:border-medical-blue hover:bg-gray-50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className={`w-12 h-12 mx-auto mb-4 ${
              isUploading || !patientId.trim() ? 'text-gray-300' : 'text-gray-400'
            }`} />
            {isDragActive ? (
              <p className="text-medical-blue font-medium">Drop the files here...</p>
            ) : isUploading ? (
              <p className="text-gray-500">Upload in progress...</p>
            ) : !patientId.trim() ? (
              <p className="text-gray-500">Please enter a Patient ID first</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  <span className="font-medium text-medical-blue">Click to upload</span> or drag and drop
                </p>
                <p className="text-sm text-gray-500">EDF, EDF+, CSV, TXT files up to 500MB</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Queue */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Queue</CardTitle>
            <CardDescription>Monitor file upload progress and validation status</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploadedFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">{file.name}</TableCell>
                    <TableCell>{file.patientId}</TableCell>
                    <TableCell>{formatFileSize(file.size)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        file.priority === "urgent" ? "destructive" :
                        file.priority === "normal" ? "default" : "secondary"
                      }>
                        {file.priority ? file.priority.charAt(0).toUpperCase() + file.priority.slice(1) : ''}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(file.status)}</TableCell>
                    <TableCell>
                      {(file.status === "uploading" || file.status === "analyzing") && (
                        <div className="space-y-1">
                          <Progress value={file.progress} className="w-24" />
                          <p className="text-xs text-gray-500">
                            {file.status === "uploading" ? "Uploading..." : "Analyzing..."}
                          </p>
                        </div>
                      )}
                      {file.status === "uploaded" && <CheckCircle className="w-5 h-5 text-purple-600" />}
                      {file.status === "completed" && (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push('/queue')}
                          >
                            View Results
                          </Button>
                        </div>
                      )}
                      {file.status === "error" && (
                        <div className="space-y-1">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                          {file.error && <p className="text-xs text-red-600">{file.error}</p>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {file.status === "completed" && file.jobId && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              if (file.jobId && !isNaN(file.jobId)) {
                                router.push(`/results/${file.jobId}`)
                              } else {
                                console.error("Invalid job ID:", file.jobId)
                              }
                            }}
                            disabled={!file.jobId || isNaN(file.jobId)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        )}
                        {(file.status === "uploaded" || file.status === "completed") && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handlePredict(file)}
                            disabled={predictingFileIds.has(file.id)}
                            className="text-medical-blue hover:text-blue-700"
                          >
                            {predictingFileIds.has(file.id) ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-1" />
                            )}
                            Predict
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => removeFile(file.id)}
                          disabled={file.status === "uploading" || file.status === "analyzing"}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {completedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Navigate to view your analysis results ({completedFiles.length} completed)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button 
                className="bg-medical-blue hover:bg-blue-700"
                onClick={() => router.push('/results')}
              >
                <FileText className="w-4 h-4 mr-2" />
                View All Results
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push('/queue')}
              >
                <Eye className="w-4 h-4 mr-2" />
                Analysis Queue
              </Button>
              <Button 
                variant="outline"
                onClick={() => setUploadedFiles(files => files.filter(f => f.status !== "completed" && f.status !== "error"))}
              >
                <X className="w-4 h-4 mr-2" />
                Clear Completed
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
