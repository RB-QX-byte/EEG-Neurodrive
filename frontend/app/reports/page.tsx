"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Printer, Mail, Brain, AlertTriangle } from "lucide-react"

export default function ReportsPage() {
  const [reportTemplate, setReportTemplate] = useState("clinical")
  const [patientInfo, setPatientInfo] = useState({
    patientId: "",
    age: "",
    gender: "",
    recordingDate: "",
    clinicalHistory: "",
    medications: "",
  })

  const analysisResults = {
    primaryDiagnosis: "",
    confidence: 0,
    riskLevel: "",
    processingTime: "",
    modelVersion: "",
    recordingDuration: "",
    abnormalSegments: 0,
    spectralAbnormalities: [],
  }

  const generateReport = () => {
    console.log("Generating report with template:", reportTemplate)
    console.log("Patient info:", patientInfo)
    // Implement report generation logic
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-medical-blue to-blue-600 text-white p-6 rounded-lg">
        <div className="flex items-center space-x-3">
          <FileText className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Report Generation</h1>
            <p className="text-blue-100">Generate comprehensive analysis reports for clinical and research use</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Report Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Report Configuration</CardTitle>
                <CardDescription>Select template and configure report parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="template">Report Template</Label>
                  <Select value={reportTemplate} onValueChange={setReportTemplate}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clinical">Clinical Report</SelectItem>
                      <SelectItem value="research">Research Report</SelectItem>
                      <SelectItem value="brief">Brief Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="patientId">Patient ID</Label>
                    <Input
                      id="patientId"
                      value={patientInfo.patientId}
                      onChange={(e) => setPatientInfo({ ...patientInfo, patientId: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      value={patientInfo.age}
                      onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={patientInfo.gender}
                      onValueChange={(value) => setPatientInfo({ ...patientInfo, gender: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="recordingDate">Recording Date</Label>
                    <Input
                      id="recordingDate"
                      type="date"
                      value={patientInfo.recordingDate}
                      onChange={(e) => setPatientInfo({ ...patientInfo, recordingDate: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="clinicalHistory">Clinical History</Label>
                  <Textarea
                    id="clinicalHistory"
                    placeholder="Enter relevant clinical history..."
                    value={patientInfo.clinicalHistory}
                    onChange={(e) => setPatientInfo({ ...patientInfo, clinicalHistory: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="medications">Current Medications</Label>
                  <Textarea
                    id="medications"
                    placeholder="List current medications..."
                    value={patientInfo.medications}
                    onChange={(e) => setPatientInfo({ ...patientInfo, medications: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex space-x-3">
                  <Button onClick={generateReport} className="bg-medical-blue hover:bg-blue-700">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis Summary</CardTitle>
                <CardDescription>Current analysis results to be included in the report</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain className="w-5 h-5 text-red-600" />
                    <h3 className="font-semibold text-red-800">Primary Diagnosis</h3>
                  </div>
                  <p className="text-2xl font-bold text-red-700">{analysisResults.primaryDiagnosis}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <Badge className="bg-red-100 text-red-800">{analysisResults.confidence}% Confidence</Badge>
                    <Badge className="bg-red-100 text-red-800">{analysisResults.riskLevel} Risk</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">Processing Time</p>
                    <p className="font-semibold text-blue-800">{analysisResults.processingTime}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">Model Version</p>
                    <p className="font-semibold text-blue-800">{analysisResults.modelVersion}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">Recording Duration</p>
                    <p className="font-semibold text-blue-800">{analysisResults.recordingDuration}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">Abnormal Segments</p>
                    <p className="font-semibold text-blue-800">{analysisResults.abnormalSegments}</p>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <h4 className="font-medium text-yellow-800">Key Findings</h4>
                  </div>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {analysisResults.spectralAbnormalities.map((finding, index) => (
                      <li key={index}>• {finding}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Report Preview</CardTitle>
              <CardDescription>Preview of the generated clinical report</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-white border rounded-lg p-8 max-w-4xl mx-auto" style={{ fontFamily: "serif" }}>
                {/* Report Header */}
                <div className="text-center mb-8 border-b pb-4">
                  <h1 className="text-2xl font-bold text-medical-blue mb-2">NeuroClassify</h1>
                  <h2 className="text-xl font-semibold text-gray-800">EEG Analysis Report</h2>
                  <p className="text-gray-600 mt-2">AI-Powered Neurological Disorder Classification</p>
                </div>

                {/* Patient Information */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-1">
                    Patient Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Patient ID:</span> {patientInfo.patientId}
                    </div>
                    <div>
                      <span className="font-medium">Age:</span> {patientInfo.age} years
                    </div>
                    <div>
                      <span className="font-medium">Gender:</span> {patientInfo.gender}
                    </div>
                    <div>
                      <span className="font-medium">Recording Date:</span> {patientInfo.recordingDate}
                    </div>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-1">
                    Executive Summary
                  </h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-red-800">Critical Finding</span>
                    </div>
                    <p className="text-red-700">
                      High-confidence detection of <strong>{analysisResults.primaryDiagnosis}</strong> with
                      {analysisResults.confidence}% model confidence. Immediate neurological consultation recommended.
                    </p>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    The CNN-LSTM deep learning model analyzed a {analysisResults.recordingDuration} EEG recording and
                    identified significant abnormalities consistent with epileptiform activity. The analysis detected{" "}
                    {analysisResults.abnormalSegments} abnormal segments with characteristic spike-wave patterns and
                    spectral abnormalities in multiple frequency bands.
                  </p>
                </div>

                {/* Detailed Findings */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-1">
                    Detailed Analysis Results
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Classification Results</h4>
                      <ul className="text-sm text-gray-700 space-y-1 ml-4">
                        <li>• Primary Diagnosis: {analysisResults.primaryDiagnosis}</li>
                        <li>• Model Confidence: {analysisResults.confidence}%</li>
                        <li>• Risk Assessment: {analysisResults.riskLevel}</li>
                        <li>• Processing Time: {analysisResults.processingTime}</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Spectral Analysis Findings</h4>
                      <ul className="text-sm text-gray-700 space-y-1 ml-4">
                        {analysisResults.spectralAbnormalities.map((finding, index) => (
                          <li key={index}>• {finding}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-1">
                    Clinical Recommendations
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Immediate Actions</h4>
                    <ul className="text-sm text-blue-700 space-y-1 ml-4">
                      <li>• Schedule urgent neurological consultation</li>
                      <li>• Consider continuous EEG monitoring</li>
                      <li>• Evaluate for anti-epileptic medication</li>
                      <li>• Implement seizure precautions</li>
                      <li>• Patient and family education on seizure management</li>
                    </ul>
                  </div>
                </div>

                {/* Technical Parameters */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-1">
                    Technical Parameters
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Model Version:</span> {analysisResults.modelVersion}
                    </div>
                    <div>
                      <span className="font-medium">Analysis Date:</span> {new Date().toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Recording Duration:</span> {analysisResults.recordingDuration}
                    </div>
                    <div>
                      <span className="font-medium">Sampling Rate:</span> 500 Hz
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t pt-4 mt-8 text-xs text-gray-500">
                  <p>
                    This report was generated by NeuroClassify AI system. Results should be interpreted by qualified
                    medical professionals in conjunction with clinical assessment and other diagnostic tests.
                  </p>
                  <p className="mt-2">
                    Report generated on {new Date().toLocaleString()} | Model Accuracy: 99.39% (Epilepsy Detection)
                  </p>
                </div>
              </div>

              <div className="flex justify-center space-x-4 mt-6">
                <Button>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline">
                  <Printer className="w-4 h-4 mr-2" />
                  Print Report
                </Button>
                <Button variant="outline">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Report History</CardTitle>
              <CardDescription>Previously generated reports and export history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    id: 1,
                    patientId: "PT-2024-001",
                    reportType: "Clinical Report",
                    generatedDate: "2024-01-15 15:30",
                    diagnosis: "Epilepsy",
                    status: "Downloaded",
                  },
                  {
                    id: 2,
                    patientId: "PT-2024-002",
                    reportType: "Brief Summary",
                    generatedDate: "2024-01-15 14:45",
                    diagnosis: "Normal",
                    status: "Emailed",
                  },
                  {
                    id: 3,
                    patientId: "PT-2024-003",
                    reportType: "Research Report",
                    generatedDate: "2024-01-15 13:20",
                    diagnosis: "Parkinson's Disease",
                    status: "Printed",
                  },
                ].map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <FileText className="w-8 h-8 text-medical-blue" />
                      <div>
                        <p className="font-medium">
                          {report.patientId} - {report.reportType}
                        </p>
                        <p className="text-sm text-gray-600">
                          Generated: {report.generatedDate} | Diagnosis: {report.diagnosis}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">{report.status}</Badge>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        Re-download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
