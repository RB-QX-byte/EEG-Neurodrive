"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { resultsAPI, AnalysisJob } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Brain, 
  Search, 
  FileText, 
  Calendar, 
  Filter,
  Eye,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  TrendingUp,
  Clock,
  Activity
} from "lucide-react"
import { formatSafeDate } from "@/lib/date-utils"

export default function ResultsLibrary() {
  const router = useRouter()
  const [results, setResults] = useState<AnalysisJob[]>([])
  const [filteredResults, setFilteredResults] = useState<AnalysisJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [diagnosisFilter, setDiagnosisFilter] = useState("all")
  const [sortBy, setSortBy] = useState("date")

  useEffect(() => {
    fetchResults()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [results, searchTerm, statusFilter, diagnosisFilter, sortBy])

  const fetchResults = async () => {
    try {
      setIsLoading(true)
      const data = await resultsAPI.getResults()
      setResults(data.results)
      setError("")
    } catch (err: any) {
      setError(err.message || "Failed to load results")
      console.error("Results error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...results]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(result => 
        result.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.result?.primary_diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(result => result.status === statusFilter)
    }

    // Diagnosis filter
    if (diagnosisFilter !== "all") {
      filtered = filtered.filter(result => 
        result.result?.primary_diagnosis?.toLowerCase().includes(diagnosisFilter.toLowerCase())
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime()
        case "confidence":
          return (b.result?.confidence || 0) - (a.result?.confidence || 0)
        case "patient":
          return a.patient_id.localeCompare(b.patient_id)
        case "diagnosis":
          return (a.result?.primary_diagnosis || "").localeCompare(b.result?.primary_diagnosis || "")
        default:
          return 0
      }
    })

    setFilteredResults(filtered)
  }

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
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getConfidenceBadge = (confidence: number | null) => {
    if (confidence === null || confidence === undefined) return null

    let className = ""
    let icon = null

    if (confidence >= 90) {
      className = "bg-green-100 text-green-800 hover:bg-green-100"
      icon = <TrendingUp className="w-3 h-3 mr-1" />
    } else if (confidence >= 70) {
      className = "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      icon = <Activity className="w-3 h-3 mr-1" />
    } else {
      className = "bg-red-100 text-red-800 hover:bg-red-100"
      icon = <AlertCircle className="w-3 h-3 mr-1" />
    }

    return (
      <Badge className={className}>
        {icon}
        {confidence.toFixed(1)}%
      </Badge>
    )
  }

  const getRiskBadge = (riskLevel: string | null) => {
    if (!riskLevel) return null

    switch (riskLevel.toLowerCase()) {
      case "high":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">High Risk</Badge>
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Medium Risk</Badge>
      case "low":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Low Risk</Badge>
      default:
        return <Badge variant="secondary">{riskLevel}</Badge>
    }
  }

  const getUniqueValues = (field: string) => {
    const values = results
      .map(result => {
        switch (field) {
          case "diagnosis":
            return result.result?.primary_diagnosis
          case "status":
            return result.status
          default:
            return null
        }
      })
      .filter(Boolean)
    return [...new Set(values)]
  }

  // Calculate statistics
  const completedResults = results.filter(r => r.status === "completed" && r.result)
  const averageConfidence = completedResults.length > 0 
    ? completedResults.reduce((sum, r) => sum + (r.result?.confidence || 0), 0) / completedResults.length
    : 0
  
  const diagnosisDistribution = completedResults.reduce((acc, result) => {
    const diagnosis = result.result?.primary_diagnosis || "Unknown"
    acc[diagnosis] = (acc[diagnosis] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
          <span className="ml-2 text-gray-600">Loading results library...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Brain className="w-8 h-8 text-medical-blue" />
            <span>Results Library</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Comprehensive archive of all EEG analysis results and findings
          </p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline">
          <Activity className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Results</CardTitle>
            <FileText className="h-5 w-5 text-medical-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{results.length}</div>
            <p className="text-xs text-gray-600 mt-1">All analyses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{completedResults.length}</div>
            <p className="text-xs text-gray-600 mt-1">Successfully analyzed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Confidence</CardTitle>
            <TrendingUp className="h-5 w-5 text-medical-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{averageConfidence.toFixed(1)}%</div>
            <p className="text-xs text-gray-600 mt-1">Model accuracy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Top Diagnosis</CardTitle>
            <Brain className="h-5 w-5 text-medical-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-gray-900">
              {Object.keys(diagnosisDistribution).length > 0 
                ? Object.entries(diagnosisDistribution).sort(([,a], [,b]) => b - a)[0][0]
                : "None"}
            </div>
            <p className="text-xs text-gray-600 mt-1">Most common finding</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-medical-blue" />
            <span>Search & Filter Results</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search patient ID, filename, or diagnosis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {getUniqueValues("status").map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={diagnosisFilter} onValueChange={setDiagnosisFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by diagnosis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Diagnoses</SelectItem>
                {getUniqueValues("diagnosis").map((diagnosis) => (
                  <SelectItem key={diagnosis} value={diagnosis}>{diagnosis}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Latest First</SelectItem>
                <SelectItem value="confidence">Highest Confidence</SelectItem>
                <SelectItem value="patient">Patient ID</SelectItem>
                <SelectItem value="diagnosis">Diagnosis</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {filteredResults.length} of {results.length} results
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Results</CardTitle>
          <CardDescription>
            Detailed view of all EEG analysis results with comprehensive findings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient ID</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Analysis Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Primary Diagnosis</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Model Version</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.length > 0 ? (
                filteredResults.map((result) => (
                  <TableRow key={result.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{result.patient_id}</TableCell>
                    <TableCell className="max-w-48 truncate" title={result.file_name}>
                      {result.file_name}
                    </TableCell>
                    <TableCell>{formatSafeDate(result.completed_at || result.created_at)}</TableCell>
                    <TableCell>{getStatusBadge(result.status)}</TableCell>
                    <TableCell>
                      {result.result?.primary_diagnosis || (
                        result.status === "completed" ? "No diagnosis" : "Pending"
                      )}
                    </TableCell>
                    <TableCell>
                      {getConfidenceBadge(result.result?.confidence || null)}
                    </TableCell>
                    <TableCell>
                      {getRiskBadge(result.result?.risk_level || null)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {result.result?.model_version || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {result.status === "completed" && result.result && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (result.id && !isNaN(result.id)) {
                                router.push(`/results/${result.id}`)
                              } else {
                                console.error("Invalid result ID:", result.id)
                              }
                            }}
                            disabled={!result.id || isNaN(result.id)}
                            className="text-medical-blue hover:text-blue-700"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        )}
                        {result.status === "processing" && (
                          <Badge variant="secondary" className="text-xs">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Processing
                          </Badge>
                        )}
                        {result.status === "failed" && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3 text-gray-500">
                      <Brain className="w-12 h-12 text-gray-300" />
                      <p className="text-lg font-medium">No results found</p>
                      <p className="text-sm">
                        {searchTerm || statusFilter !== "all" || diagnosisFilter !== "all" 
                          ? "Try adjusting your search filters" 
                          : "Upload and analyze EEG files to see results here"}
                      </p>
                    </div>
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