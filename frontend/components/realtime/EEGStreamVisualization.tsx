"use client"

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Activity, AlertTriangle, Brain, Wifi, WifiOff, Zap, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EEGStreamData {
  timestamp: string;
  channels: Record<string, number>;
  predictions: Record<string, number>;
  anomalies: Array<{
    channel: string;
    severity: string;
    type: string;
    timestamp: string;
    confidence: number;
    description: string;
  }>;
  quality: {
    overall: number;
    channel_snr: Record<string, number>;
    impedance: Record<string, number>;
    artifact_rate: number;
  };
}

interface EEGStreamVisualizationProps {
  className?: string;
  autoConnect?: boolean;
}

export function EEGStreamVisualization({ className, autoConnect = false }: EEGStreamVisualizationProps) {
  const [streamData, setStreamData] = useState<EEGStreamData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [latestData, setLatestData] = useState<EEGStreamData | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['Fp1', 'Fp2', 'C3', 'C4']);
  const svgRef = useRef<SVGSVGElement>(null);
  const ws = useRef<WebSocket | null>(null);
  const animationRef = useRef<number>();

  const connectWebSocket = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    
    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.hostname}:8080/ws/eeg-stream`;
    
    ws.current = new WebSocket(wsUrl);
    
    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setIsConnecting(false);
      
      // Send initial configuration
      ws.current?.send(JSON.stringify({
        action: 'start_streaming',
        channels: selectedChannels
      }));
    };
    
    ws.current.onmessage = (event) => {
      try {
        const data: EEGStreamData = JSON.parse(event.data);
        setLatestData(data);
        setStreamData(prev => {
          const newData = [...prev, data];
          // Keep only last 500 data points for performance
          return newData.slice(-500);
        });
      } catch (error) {
        console.error('Error parsing WebSocket data:', error);
      }
    };
    
    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnecting(false);
    };
    
    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setIsConnecting(false);
    };
  };

  const disconnectWebSocket = () => {
    if (ws.current) {
      ws.current.send(JSON.stringify({ action: 'stop_streaming' }));
      ws.current.close();
      ws.current = null;
    }
    setIsConnected(false);
    setStreamData([]);
    setLatestData(null);
  };

  useEffect(() => {
    if (autoConnect) {
      connectWebSocket();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      disconnectWebSocket();
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current || streamData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous content

    const margin = { top: 20, right: 80, bottom: 30, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(streamData, d => new Date(d.timestamp)) as [Date, Date])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([-100, 100])
      .range([height, 0]);

    // Create color scale for channels
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%H:%M:%S')));

    g.append('g')
      .call(d3.axisLeft(yScale));

    // Add axis labels
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Amplitude (μV)');

    // Draw waveforms for selected channels
    selectedChannels.forEach((channel, i) => {
      const line = d3.line<EEGStreamData>()
        .x(d => xScale(new Date(d.timestamp)))
        .y(d => yScale(d.channels[channel] || 0))
        .curve(d3.curveMonotoneX);

      const path = g.append('path')
        .datum(streamData)
        .attr('class', `channel-${channel}`)
        .attr('fill', 'none')
        .attr('stroke', colorScale(channel))
        .attr('stroke-width', 1.5)
        .attr('d', line);

      // Add channel label
      g.append('text')
        .attr('x', width + 5)
        .attr('y', i * 20)
        .attr('fill', colorScale(channel))
        .style('font-size', '12px')
        .text(channel);
    });

    // Highlight anomalies
    const anomalies = streamData.filter(d => d.anomalies.length > 0);
    anomalies.forEach(d => {
      d.anomalies.forEach(anomaly => {
        if (selectedChannels.includes(anomaly.channel)) {
          g.append('circle')
            .attr('cx', xScale(new Date(d.timestamp)))
            .attr('cy', yScale(d.channels[anomaly.channel] || 0))
            .attr('r', 4)
            .attr('fill', anomaly.severity === 'critical' ? 'red' : 
                         anomaly.severity === 'high' ? 'orange' : 'yellow')
            .attr('opacity', 0.7);
        }
      });
    });

  }, [streamData, selectedChannels]);

  const getPredictionBadgeColor = (value: number) => {
    if (value > 0.7) return 'bg-red-500';
    if (value > 0.3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getQualityColor = (value: number) => {
    if (value > 80) return 'text-green-600';
    if (value > 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Connection Status and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <CardTitle>Real-time EEG Streaming</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Badge className="bg-green-500">
                    <Wifi className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={disconnectWebSocket}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <>
                  <Badge variant="secondary">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Disconnected
                  </Badge>
                  <Button 
                    size="sm"
                    onClick={connectWebSocket}
                    disabled={isConnecting}
                  >
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </Button>
                </>
              )}
            </div>
          </div>
          <CardDescription>
            Live monitoring of EEG signals with anomaly detection
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Signal Quality Metrics */}
      {latestData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Signal Quality</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className={cn("text-2xl font-bold", getQualityColor(latestData.quality.overall))}>
                  {latestData.quality.overall.toFixed(0)}%
                </span>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <Progress value={latestData.quality.overall} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Artifact Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {latestData.quality.artifact_rate.toFixed(1)}%
                </span>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {latestData.quality.artifact_rate < 5 ? 'Good' : 'High noise'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Primary Prediction</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(latestData.predictions).sort((a, b) => b[1] - a[1]).slice(0, 1).map(([key, value]) => (
                <div key={key}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold capitalize">{key}</span>
                    <Badge className={getPredictionBadgeColor(value)}>
                      {(value * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Anomalies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {latestData.anomalies.length}
                </span>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </div>
              {latestData.anomalies.length > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {latestData.anomalies[0].type} detected
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Waveform Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>EEG Waveforms</CardTitle>
          <CardDescription>
            Real-time visualization of selected EEG channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <div className="space-y-4">
              {/* Channel Selection */}
              <div className="flex flex-wrap gap-2">
                {['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4', 'P3', 'P4', 'O1', 'O2'].map(channel => (
                  <Badge
                    key={channel}
                    variant={selectedChannels.includes(channel) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedChannels(prev => 
                        prev.includes(channel) 
                          ? prev.filter(c => c !== channel)
                          : [...prev, channel].slice(0, 4) // Limit to 4 channels
                      );
                    }}
                  >
                    {channel}
                  </Badge>
                ))}
              </div>
              
              {/* SVG Waveform Display */}
              <div className="border rounded-lg p-4 bg-background relative">
                <svg ref={svgRef} width={800} height={400} />
                {streamData.length > 0 && (
                  <div className="absolute top-2 right-2 text-xs text-muted-foreground">
                    Latency: <span className="font-mono">{streamData.length > 1 ? 
                      (new Date(streamData[streamData.length - 1].timestamp).getTime() - 
                       new Date().getTime() + 100) : 0}ms</span>
                  </div>
                )}
              </div>

              {/* Anomaly Alerts */}
              {latestData?.anomalies && latestData.anomalies.length > 0 && (
                <Alert className="border-yellow-500">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Anomaly Detected:</strong> {latestData.anomalies[0].description} 
                    in channel {latestData.anomalies[0].channel} 
                    (Confidence: {(latestData.anomalies[0].confidence * 100).toFixed(0)}%)
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <WifiOff className="h-12 w-12 mb-4" />
              <p>Not connected to EEG stream</p>
              <p className="text-sm mt-1">Click "Connect" to start real-time monitoring</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Predictions Panel */}
      {latestData && isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Real-time Predictions</CardTitle>
            <CardDescription>
              Live classification results from the CNN-LSTM model
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(latestData.predictions).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="capitalize">{key}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={value * 100} className="w-32" />
                    <span className="text-sm font-medium w-12 text-right">
                      {(value * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
