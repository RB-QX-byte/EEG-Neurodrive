"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ErrorBoundary } from "@/components/error-boundary"
import { EEGWaveformChart } from "@/components/charts/eeg-waveform-chart"
import { AnalysisTrendsChart } from "@/components/dashboard/analysis-trends-chart"
import { EnhancedDropzone } from "@/components/upload/enhanced-dropzone"
import QueuePage from "./queue/page"
// Default data structures
const defaultEEGData = [
  {
    time: new Date().toISOString(),
    channel_1: 0,
    channel_2: 0,
    channel_3: 0,
    channel_4: 0,
    channel_5: 0,
    channel_6: 0,
    channel_7: 0,
    channel_8: 0
  }
]

const defaultTrendsData = [
  {
    date: new Date().toISOString().split('T')[0],
    completed: 0,
    failed: 0,
    processing: 0
  }
]

const defaultChannels = [
  "channel_1", "channel_2", "channel_3", "channel_4",
  "channel_5", "channel_6", "channel_7", "channel_8"
]
import { Activity, Upload, BarChart3, Clock, AlertTriangle } from 'lucide-react'

export default function EEGAnalysisPage() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const handleFilesAccepted = (files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files])
    console.log('Files accepted:', files)
  }

  const triggerError = () => {
    throw new Error('Test error for ErrorBoundary')
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">EEG Analysis Platform</h1>
              <p className="text-gray-600 mt-2">Advanced neurological data processing and visualization</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-medical-blue border-medical-blue">
                <Activity className="w-4 h-4 mr-1" />
                Live System
              </Badge>
              <Button onClick={triggerError} variant="outline" size="sm">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Test Error Boundary
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dashboard" className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="queue" className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Queue</span>
              </TabsTrigger>
              <TabsTrigger value="visualization" className="flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>EEG Visualization</span>
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Analysis Trends Chart */}
                <AnalysisTrendsChart data={defaultTrendsData} />
                
                {/* Quick Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>System Overview</CardTitle>
                    <CardDescription>Real-time analysis statistics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">24</p>
                        <p className="text-sm text-blue-800">Active Jobs</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">156</p>
                        <p className="text-sm text-green-800">Completed Today</p>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">3.2s</p>
                        <p className="text-sm text-yellow-800">Avg Processing</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">98.5%</p>
                        <p className="text-sm text-purple-800">Accuracy Rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Queue Tab */}
            <TabsContent value="queue">
              <QueuePage />
            </TabsContent>

            {/* EEG Visualization Tab */}
            <TabsContent value="visualization" className="space-y-6">
              <EEGWaveformChart 
                data={defaultEEGData}
                channels={defaultChannels}
                title="Real-time EEG Monitoring"
                height={500}
              />
              
              {/* Additional Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EEGWaveformChart 
                  data={defaultEEGData}
                  channels={defaultChannels.slice(0, 4)}
                  title="Frontal Lobe Activity"
                  height={300}
                />
                <EEGWaveformChart 
                  data={defaultEEGData}
                  channels={defaultChannels.slice(4, 8)}
                  title="Temporal Lobe Activity"
                  height={300}
                />
              </div>
            </TabsContent>

            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upload EEG Files</CardTitle>
                  <CardDescription>
                    Upload your EEG data files for analysis. Supports .edf, .csv, and .txt formats.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EnhancedDropzone 
                    onFilesAccepted={handleFilesAccepted}
                    maxFiles={10}
                    maxSize={500 * 1024 * 1024}
                    acceptedFormats={['.edf', '.csv', '.txt']}
                  />
                </CardContent>
              </Card>

              {/* Upload Summary */}
              {uploadedFiles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Summary</CardTitle>
                    <CardDescription>
                      {uploadedFiles.length} file(s) ready for processing
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <Badge variant="outline">Ready</Badge>
                        </div>
                      ))}
                    </div>
                    <Button className="w-full mt-4 bg-medical-blue hover:bg-medical-blue/90">
                      Start Analysis
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ErrorBoundary>
  )
}