"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { dashboardAPI, analysisAPI, AnalysisJob, DashboardResponse } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Activity, Brain, Clock, FileText, TrendingUp, AlertCircle, CheckCircle, Loader2, Trash2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { formatSafeDate } from "@/lib/date-utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function Dashboard() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [predictingJobIds, setPredictingJobIds] = useState<Set<number>>(new Set())

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const data = await dashboardAPI.getDashboard()
      
      // Validate data structure
      if (data.recent_analyses) {
        const invalidAnalyses = data.recent_analyses.filter(analysis => !analysis.id)
        if (invalidAnalyses.length > 0) {
          console.warn("Found analyses without IDs:", invalidAnalyses)
          setError("Some analysis records are missing IDs. Please contact support.")
        }
      }
      
      setDashboardData(data)
      setError("") // Clear any previous errors on successful load
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data")
      console.error("Dashboard error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshDashboard = () => {
    fetchDashboardData()
  }

  useEffect(() => {
    fetchDashboardData()
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const handlePredict = async (job: AnalysisJob) => {
    if (!job.file_path) {
      setError("File path not available for prediction")
      return
    }

    try {
      setPredictingJobIds(prev => new Set(prev).add(job.id))
      setError("")

      const response = await analysisAPI.predict(job.file_path, job.patient_id)
      
      alert(`Prediction started successfully! Job ID: ${response.job_id}. Check the results page for updates.`)
      
    } catch (err: any) {
      setError(err.message || "Failed to start prediction")
      console.error("Prediction error:", err)
    } finally {
      setPredictingJobIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(job.id)
        return newSet
      })
    }
  }

  const handleDeleteAnalysis = async (analysisId: number) => {
    if (!analysisId || analysisId === undefined || analysisId === null) {
      setError("Invalid analysis ID. Please refresh the page and try again.")
      console.error("Analysis ID is invalid:", analysisId)
      return
    }

    const analysis = dashboardData?.recent_analyses.find(a => a.id === analysisId)
    
    if (!analysis) {
      setError("Analysis not found. Please refresh the page and try again.")
      console.error("Analysis not found for ID:", analysisId)
      return
    }

    const patientName = analysis.patient_id || "Unknown Patient"
    const isActiveJob = analysis.status === 'processing' || analysis.status === 'queued'
    
    const action = isActiveJob ? 'cancel' : 'delete'
    const message = isActiveJob 
      ? `Are you sure you want to cancel the analysis for ${patientName}?\n\nThis will stop the current processing.`
      : `Are you sure you want to delete the analysis for ${patientName}?\n\nThis will permanently remove the analysis job, results, and associated files. This action cannot be undone.`
    
    if (!window.confirm(message)) {
      return
    }

    try {
      setError("") // Clear any previous errors
      
      // Use unified API function that routes to correct endpoint
      await analysisAPI.deleteAnalysis(analysisId, analysis.status)
      
      // Update the state to remove the deleted/cancelled analysis
      setDashboardData(prev => {
        if (!prev) return null
        return {
          ...prev,
          recent_analyses: prev.recent_analyses.filter(analysis => analysis.id !== analysisId),
          queue_status: prev.queue_status?.filter(job => job.id !== analysisId) || [],
          stats: {
            ...prev.stats,
            pending_analyses: isActiveJob ? Math.max(0, prev.stats.pending_analyses - 1) : prev.stats.pending_analyses
          }
        }
      })
      
      // Show success message
      const successMessage = isActiveJob 
        ? `Analysis for ${patientName} has been successfully cancelled.`
        : `Analysis for ${patientName} has been successfully deleted.`
      alert(successMessage)
    } catch (err: any) {
      setError(err.message || `Failed to ${action} analysis`)
      console.error(`${action} analysis error:`, err)
    }
  }


  const quickStats = dashboardData ? [
    { 
      title: "Files Processed Today", 
      value: dashboardData.stats.files_processed_today.toString(), 
      icon: FileText, 
      color: "text-medical-blue" 
    },
    { 
      title: "Pending Analyses", 
      value: dashboardData.stats.pending_analyses.toString(), 
      icon: Clock, 
      color: "text-amber-600" 
    },
    { 
      title: "Accuracy Rate", 
      value: `${dashboardData.stats.accuracy_rate.toFixed(1)}%`, 
      icon: TrendingUp, 
      color: "text-green-600" 
    },
    { 
      title: "Avg Processing Time", 
      value: `${dashboardData.stats.avg_processing_time.toFixed(1)} min`, 
      icon: Activity, 
      color: "text-medical-blue" 
    },
  ] : []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        )
      case "processing":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Processing
          </Badge>
        )
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        )
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getConfidenceBadge = (confidence: number | null) => {
    if (confidence === null) return null

    if (confidence >= 90) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{confidence}%</Badge>
    } else if (confidence >= 70) {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{confidence}%</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{confidence}%</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
          <span className="ml-2 text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshDashboard}
              className="ml-2"
            >
              Refresh
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-medical-blue to-blue-600 text-white p-6 rounded-lg">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.username || 'User'}</h1>
            <p className="text-blue-100">Role: {user?.role || 'User'}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Real-time Analysis Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-medical-blue" />
            <span>Real-time Analysis Queue</span>
          </CardTitle>
          <CardDescription>Current processing status and queue position</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData?.queue_status && dashboardData.queue_status.length > 0 ? (
              dashboardData.queue_status.slice(0, 3).map((job, index) => (
                <div 
                  key={job.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    job.status === 'processing' ? 'bg-blue-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {job.status === 'processing' ? (
                      <Loader2 className="w-5 h-5 text-medical-blue animate-spin" />
                    ) : (
                      <Clock className="w-5 h-5 text-gray-500" />
                    )}
                    <div>
                      <p className="font-medium">{job.patient_id} - {job.file_name}</p>
                      <p className="text-sm text-gray-600">
                        {job.status === 'processing' 
                          ? `CNN-LSTM Analysis in progress...` 
                          : `Queued - Position #${index + 1}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {job.status === 'processing' ? (
                      <>
                        <Progress value={job.progress} className="w-32 mb-1" />
                        <p className="text-sm text-gray-600">
                          {job.progress}% - {job.estimated_time} min remaining
                        </p>
                      </>
                    ) : (
                      <Badge variant="secondary">Waiting</Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No active jobs in queue</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Analyses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-medical-blue" />
            <span>Recent Analyses</span>
          </CardTitle>
          <CardDescription>Latest EEG analysis results and processing status</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient ID</TableHead>
                <TableHead>File Name</TableHead>
                {user?.role === 'admin' && <TableHead>User</TableHead>}
                <TableHead>Upload Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Disorder Detected</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboardData?.recent_analyses && dashboardData.recent_analyses.length > 0 ? (
                dashboardData.recent_analyses.slice(0, 10).map((analysis) => {
                  const uniqueKey = analysis.id ?? `${analysis.patient_id}-${analysis.created_at}`;
                  const isCorrupted = !analysis.id;

                  return (
                  <TableRow key={uniqueKey} className={isCorrupted ? "bg-red-50" : ""}>
                    <TableCell className="font-medium">
                      {isCorrupted && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertCircle className="w-4 h-4 inline-block mr-2 text-red-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Corrupted data: Missing ID</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {analysis.patient_id}
                      </TableCell>
                    <TableCell>{analysis.file_name}</TableCell>
                    {user?.role === 'admin' && (
                      <TableCell>
                        <Badge variant="outline">{analysis.user?.username || `User ${analysis.user_id}`}</Badge>
                      </TableCell>
                    )}
                    <TableCell>{formatSafeDate(analysis.created_at)}</TableCell>
                    <TableCell>{getStatusBadge(analysis.status)}</TableCell>
                    <TableCell>
                      {analysis.result?.primary_diagnosis || 'Pending'}
                    </TableCell>
                    <TableCell>
                      {getConfidenceBadge(analysis.result?.confidence || null)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {analysis.status === "completed" && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                if (analysis.id) {
                                  router.push(`/results/${analysis.id}`)
                                } else {
                                  setError("Invalid analysis ID. Cannot view results.")
                                }
                              }}
                              disabled={!analysis.id}
                              aria-label={`View results for ${analysis.patient_id}`}
                            >
                              View Results
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePredict(analysis)}
                              disabled={!analysis.id || predictingJobIds.has(analysis.id)}
                              className="text-medical-blue hover:text-blue-700"
                              aria-label={`Run prediction for ${analysis.patient_id}`}
                            >
                              {predictingJobIds.has(analysis.id) ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Activity className="w-4 h-4 mr-1" />
                              )}
                              Predict
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteAnalysis(analysis.id)}
                              disabled={!analysis.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              aria-label={`Delete analysis for ${analysis.patient_id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </>
                        )}
                        {analysis.status === "processing" && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              disabled
                              aria-label={`Processing analysis for ${analysis.patient_id}`}
                            >
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              Processing...
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteAnalysis(analysis.id)}
                              disabled={!analysis.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              aria-label={`Cancel processing for ${analysis.patient_id}`}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                          </>
                        )}
                        {analysis.status === "failed" && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={!analysis.id}
                              aria-label={`Retry analysis for ${analysis.patient_id}`}
                            >
                              Retry
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteAnalysis(analysis.id)}
                              disabled={!analysis.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              aria-label={`Delete failed analysis for ${analysis.patient_id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </>
                        )}
                        {/* Cancel/Delete button for other statuses like queued */}
                        {!["completed", "processing", "failed"].includes(analysis.status) && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteAnalysis(analysis.id)}
                            disabled={!analysis.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            aria-label={`Cancel analysis for ${analysis.patient_id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )})
              ) : (
                <TableRow>
                  <TableCell colSpan={user?.role === 'admin' ? 8 : 7} className="text-center py-8 text-gray-500">
                    No recent analyses found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
