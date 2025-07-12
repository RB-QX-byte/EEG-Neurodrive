"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Database, 
  Download, 
  Trash2, 
  Eye, 
  Search, 
  Calendar,
  BarChart3,
  Loader2,
  AlertCircle,
  Users,
  Activity
} from "lucide-react"
import { eegDataAPI, analysisAPI, EEGSubject, EEGDataPoint } from "@/lib/api"
import { formatSafeDate, DATE_FORMATS } from "@/lib/date-utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export default function EEGDataPage() {
  const [subjects, setSubjects] = useState<EEGSubject[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>("")
  const [eegData, setEegData] = useState<EEGDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [dataLimit, setDataLimit] = useState("1000")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [isPredicting, setIsPredicting] = useState(false)
  const [predictSuccess, setPredictSuccess] = useState(false)

  // Load subjects on component mount
  useEffect(() => {
    loadSubjects()
  }, [])

  const loadSubjects = async () => {
    try {
      setIsLoading(true)
      const response = await eegDataAPI.getSubjects()
      setSubjects(response.subjects)
    } catch (err: any) {
      setError(err.message || "Failed to load EEG subjects")
    } finally {
      setIsLoading(false)
    }
  }

  const loadEEGData = async (subjectId: string) => {
    if (!subjectId) return

    try {
      setIsLoadingData(true)
      const limit = parseInt(dataLimit)
      const response = await eegDataAPI.getEEGData(
        subjectId, 
        limit,
        startTime || undefined,
        endTime || undefined
      )
      setEegData(response.data_points)
    } catch (err: any) {
      setError(err.message || "Failed to load EEG data")
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubject(subjectId)
    if (subjectId) {
      loadEEGData(subjectId)
    } else {
      setEegData([])
    }
  }

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm(`Are you sure you want to delete all data for subject ${subjectId}? This action cannot be undone.`)) {
      return
    }

    try {
      await eegDataAPI.deleteEEGData(subjectId)
      await loadSubjects()
      if (selectedSubject === subjectId) {
        setSelectedSubject("")
        setEegData([])
      }
      alert("EEG data deleted successfully")
    } catch (err: any) {
      setError(err.message || "Failed to delete EEG data")
    }
  }

  const handlePredict = async (subjectId: string) => {
    if (!subjectId) {
      setError("Please select a subject to run predictions")
      return
    }

    try {
      setIsPredicting(true)
      setPredictSuccess(false)
      setError("")

      // Use a mock file path for the subject data - in real implementation,
      // you'd either export the data to a file or modify the backend to handle subject IDs directly
      const filePath = `uploads/subject_${subjectId}_data.csv`
      
      const response = await analysisAPI.predict(filePath, subjectId)
      
      setPredictSuccess(true)
      alert(`Prediction started successfully! Job ID: ${response.job_id}. Check the results page for updates.`)
      
    } catch (err: any) {
      setError(err.message || "Failed to start prediction")
      console.error("Prediction error:", err)
    } finally {
      setIsPredicting(false)
    }
  }

  const filteredSubjects = subjects.filter(subject =>
    subject.subject_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Prepare chart data (showing first 100 points for performance)
  const chartData = eegData.slice(0, 100).map((point, index) => ({
    time: index,
    channel1: point.channel_1,
    channel2: point.channel_2,
    channel3: point.channel_3,
  }))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
          <span className="ml-2 text-gray-600">Loading EEG data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-medical-blue to-blue-600 text-white p-6 rounded-lg">
        <div className="flex items-center space-x-3">
          <Database className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">EEG Data Management</h1>
            <p className="text-blue-100">Manage and analyze TimescaleDB EEG datasets</p>
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

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
            <Users className="h-4 w-4 text-medical-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subjects.length}</div>
            <p className="text-xs text-gray-600">EEG subjects in database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected Data Points</CardTitle>
            <Activity className="h-4 w-4 text-medical-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eegData.length.toLocaleString()}</div>
            <p className="text-xs text-gray-600">Time-series data points</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Channels</CardTitle>
            <BarChart3 className="h-4 w-4 text-medical-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">19</div>
            <p className="text-xs text-gray-600">EEG channels per data point</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subjects" className="space-y-6">
        <TabsList>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="data">Data Viewer</TabsTrigger>
          <TabsTrigger value="visualization">Visualization</TabsTrigger>
        </TabsList>

        {/* Subjects Tab */}
        <TabsContent value="subjects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>EEG Subjects</CardTitle>
              <CardDescription>
                Manage EEG subjects and their associated time-series data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="flex items-center space-x-2 mb-4">
                <Search className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search subjects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {/* Subjects Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject ID</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubjects.length > 0 ? (
                    filteredSubjects.map((subject) => (
                      <TableRow key={subject.id}>
                        <TableCell className="font-medium">{subject.subject_id}</TableCell>
                        <TableCell>{subject.description}</TableCell>
                        <TableCell>{subject.age || 'N/A'}</TableCell>
                        <TableCell>{subject.gender || 'N/A'}</TableCell>
                        <TableCell>
                          {subject.condition && (
                            <Badge variant="outline">{subject.condition}</Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatSafeDate(subject.created_at, DATE_FORMATS.DATE_ONLY)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSubjectSelect(subject.subject_id)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePredict(subject.subject_id)}
                              disabled={isPredicting}
                              className="text-medical-blue hover:text-blue-700"
                            >
                              {isPredicting ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Activity className="w-4 h-4 mr-1" />
                              )}
                              Predict
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSubject(subject.subject_id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No EEG subjects found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Viewer Tab */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>EEG Data Viewer</CardTitle>
              <CardDescription>
                View time-series EEG data with filtering options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Data Controls */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={selectedSubject} onValueChange={handleSubjectSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.subject_id}>
                          {subject.subject_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="limit">Data Limit</Label>
                  <Select value={dataLimit} onValueChange={setDataLimit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100 points</SelectItem>
                      <SelectItem value="500">500 points</SelectItem>
                      <SelectItem value="1000">1,000 points</SelectItem>
                      <SelectItem value="5000">5,000 points</SelectItem>
                      <SelectItem value="10000">10,000 points</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time (optional)</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time (optional)</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button 
                  onClick={() => selectedSubject && loadEEGData(selectedSubject)}
                  disabled={!selectedSubject || isLoadingData}
                >
                  {isLoadingData ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Load Data
                    </>
                  )}
                </Button>

                <Button 
                  onClick={() => selectedSubject && handlePredict(selectedSubject)}
                  disabled={!selectedSubject || isPredicting}
                  className="bg-medical-blue hover:bg-blue-700 text-white"
                >
                  {isPredicting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Predicting...
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4 mr-2" />
                      Run Prediction
                    </>
                  )}
                </Button>
              </div>

              {/* Data Table */}
              {eegData.length > 0 && (
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Channel 1</TableHead>
                        <TableHead>Channel 2</TableHead>
                        <TableHead>Channel 3</TableHead>
                        <TableHead>Channel 4</TableHead>
                        <TableHead>Channel 5</TableHead>
                        <TableHead>...</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eegData.slice(0, 50).map((point, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-xs">
                            {formatSafeDate(point.time, DATE_FORMATS.TIME_WITH_MS)}
                          </TableCell>
                          <TableCell>{point.channel_1.toFixed(3)}</TableCell>
                          <TableCell>{point.channel_2.toFixed(3)}</TableCell>
                          <TableCell>{point.channel_3.toFixed(3)}</TableCell>
                          <TableCell>{point.channel_4.toFixed(3)}</TableCell>
                          <TableCell>{point.channel_5.toFixed(3)}</TableCell>
                          <TableCell className="text-gray-400">+14 more</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {eegData.length > 50 && (
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      Showing first 50 of {eegData.length.toLocaleString()} data points
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visualization Tab */}
        <TabsContent value="visualization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>EEG Signal Visualization</CardTitle>
              <CardDescription>
                Real-time visualization of EEG channels (showing first 100 data points)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="channel1" 
                        stroke="#2563eb" 
                        strokeWidth={1}
                        dot={false}
                        name="Channel 1"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="channel2" 
                        stroke="#dc2626" 
                        strokeWidth={1}
                        dot={false}
                        name="Channel 2"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="channel3" 
                        stroke="#16a34a" 
                        strokeWidth={1}
                        dot={false}
                        name="Channel 3"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Select a subject and load data to view EEG signals</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 