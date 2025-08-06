"use client"

import { EEGStreamVisualization } from '@/components/realtime/EEGStreamVisualization';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RealtimePage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real-time EEG Monitoring</h1>
          <p className="text-muted-foreground mt-1">
            Live streaming and analysis of EEG signals with anomaly detection
          </p>
        </div>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Main Content */}
      <EEGStreamVisualization autoConnect={false} />

      {/* Information Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Features</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Real-time EEG signal visualization with 10Hz update rate
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Live anomaly detection with severity classification
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              CNN-LSTM model predictions updated in real-time
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Signal quality metrics and artifact detection
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Multi-channel visualization with customizable selection
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Technical Details</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              WebSocket protocol for low-latency streaming
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              D3.js for high-performance data visualization
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              19-channel EEG support (10-20 system)
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Automatic reconnection and error handling
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Memory-efficient circular buffer (500 samples)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
