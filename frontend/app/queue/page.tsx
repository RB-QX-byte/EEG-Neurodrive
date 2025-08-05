"use client"

import { useState, useEffect } from "react"
import { analysisAPI, AnalysisJob } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Search, RefreshCw, Trash2, CheckCircle, AlertCircle, Clock, Loader2, Activity, Eye, Pause, Play } from "lucide-react"
import { formatSafeDate } from "@/lib/date-utils"
import { formatFileSize } from "@/lib/string-formatters"

export default function QueuePage() {
  const [queueData, setQueueData] = useState<AnalysisJob[]>([])
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchQueueData()
    // Refresh every 10 seconds for real-time updates
    const interval = setInterval(fetchQueueData, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchQueueData = async () => {
    try {
      setError("")
      const response = await analysisAPI.getQueue(
        statusFilter !== "all" ? statusFilter : undefined,
        priorityFilter !== "all" ? priorityFilter : undefined,
        searchTerm || undefined
      )
      setQueueData(response.jobs)
    } catch (err: any) {
      setError(err.message || "Failed to load queue data")
      console.error("Queue error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkCancel = async () => {
    if (selectedItems.length === 0) return
    
    try {
      await Promise.all(
        selectedItems.map(jobId => analysisAPI.cancelJob(jobId))
      )
      setSelectedItems([])
      fetchQueueData()
    } catch (err: any) {
      setError(err.message || "Failed to cancel selected jobs")
    }
  }

  const handleUpdatePriority = async (jobId: number, priority: string) => {
    try {
      await analysisAPI.updatePriority(jobId, priority)
      fetchQueueData()
    } catch (err: any) {
      setError(err.message || "Failed to update priority")
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(queueData.map(job => job.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectItem = (jobId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, jobId])
    } else {
      setSelectedItems(prev => prev.filter(id => id !== jobId))
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'queued':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      failed: "destructive", 
      processing: "secondary",
      queued: "outline"
    }
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: "bg-red-100 text-red-800",
      normal: "bg-blue-100 text-blue-800", 
      routine: "bg-gray-100 text-gray-800"
    }
    return (
      <Badge className={colors[priority] || colors.normal}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-medical-blue" />
            <span>Analysis Queue</span>
          </CardTitle>
          <CardDescription>
            Monitor and manage EEG analysis jobs in real-time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by patient ID or filename..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="routine">Routine</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchQueueData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-800">
                {selectedItems.length} item(s) selected
              </span>
              <Button 
                onClick={handleBulkCancel}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Cancel Selected
              </Button>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Queue Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedItems.length === queueData.length && queueData.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Patient ID</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queueData.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.includes(job.id)}
                      onCheckedChange={(checked) => handleSelectItem(job.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{job.patient_id}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium truncate max-w-[200px]">{job.file_name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(job.file_size)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(job.status)}
                      {getStatusBadge(job.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={job.priority}
                      onValueChange={(value) => handleUpdatePriority(job.id, value)}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="routine">Routine</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {job.status === 'processing' ? (
                      <div className="space-y-1">
                        <Progress value={job.progress} className="w-[100px]" />
                        <p className="text-xs text-gray-500">{job.progress}%</p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatSafeDate(job.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {(job.status === 'queued' || job.status === 'processing') && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => analysisAPI.cancelJob(job.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {queueData.length === 0 && (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No analysis jobs found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}