"use client"

import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, BarChart3, Activity, Eye, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExplanationData {
  prediction_id: number;
  shap_values: number[][];
  feature_importance: Record<string, number>;
  channel_contributions: Record<string, number>;
  confidence_score: number;
  prediction_class: string;
  influential_segments: Array<{
    start_time: number;
    end_time: number;
    importance_score: number;
    channel: string;
  }>;
}

interface ExplainableAIDashboardProps {
  className?: string;
  resultId?: number;
}

export function ExplainableAIDashboard({ className, resultId }: ExplainableAIDashboardProps) {
  const [explanation, setExplanation] = useState<ExplanationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const featureImportanceRef = useRef<SVGSVGElement>(null);
  const channelContributionRef = useRef<SVGSVGElement>(null);
  const shapHeatmapRef = useRef<SVGSVGElement>(null);

  const fetchExplanation = async (id: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/explainable/predict/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch explanation');
      }
      
      const data = await response.json();
      setExplanation(data.explanation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (resultId) {
      fetchExplanation(resultId);
    }
  }, [resultId]);

  // Feature Importance Visualization
  useEffect(() => {
    if (!featureImportanceRef.current || !explanation) return;

    const svg = d3.select(featureImportanceRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 80 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const data = Object.entries(explanation.feature_importance)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 features

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d[1]) || 1])
      .range([0, width]);

    const yScale = d3.scaleBand()
      .domain(data.map(d => d[0]))
      .range([0, height])
      .padding(0.1);

    // Create bars
    g.selectAll('.bar')
      .data(data)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', d => yScale(d[0]) || 0)
      .attr('width', d => xScale(d[1]))
      .attr('height', yScale.bandwidth())
      .attr('fill', '#3b82f6')
      .attr('opacity', 0.8);

    // Add value labels
    g.selectAll('.value-label')
      .data(data)
      .enter().append('text')
      .attr('class', 'value-label')
      .attr('x', d => xScale(d[1]) + 5)
      .attr('y', d => (yScale(d[0]) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .text(d => d[1].toFixed(3))
      .style('font-size', '12px')
      .style('fill', '#374151');

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale));

    g.append('g')
      .call(d3.axisLeft(yScale));

    // Add axis labels
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Features');

    g.append('text')
      .attr('transform', `translate(${width / 2}, ${height + margin.bottom})`)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Importance Score');

  }, [explanation]);

  // Channel Contribution Visualization
  useEffect(() => {
    if (!channelContributionRef.current || !explanation) return;

    const svg = d3.select(channelContributionRef.current);
    svg.selectAll('*').remove();

    const width = 600;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;

    // Standard 10-20 EEG electrode positions (simplified)
    const electrodePositions: Record<string, { x: number; y: number }> = {
      'Fp1': { x: centerX - 60, y: centerY - 140 },
      'Fp2': { x: centerX + 60, y: centerY - 140 },
      'F3': { x: centerX - 80, y: centerY - 80 },
      'F4': { x: centerX + 80, y: centerY - 80 },
      'C3': { x: centerX - 100, y: centerY },
      'C4': { x: centerX + 100, y: centerY },
      'P3': { x: centerX - 80, y: centerY + 80 },
      'P4': { x: centerX + 80, y: centerY + 80 },
      'O1': { x: centerX - 60, y: centerY + 140 },
      'O2': { x: centerX + 60, y: centerY + 140 },
      'Fz': { x: centerX, y: centerY - 80 },
      'Cz': { x: centerX, y: centerY },
      'Pz': { x: centerX, y: centerY + 80 },
      'F7': { x: centerX - 130, y: centerY - 50 },
      'F8': { x: centerX + 130, y: centerY - 50 },
      'T3': { x: centerX - 150, y: centerY },
      'T4': { x: centerX + 150, y: centerY },
      'T5': { x: centerX - 130, y: centerY + 50 },
      'T6': { x: centerX + 130, y: centerY + 50 },
    };

    const g = svg.append('g');

    // Draw head outline
    g.append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('stroke', '#d1d5db')
      .attr('stroke-width', 2);

    // Draw nose
    g.append('path')
      .attr('d', `M ${centerX - 10} ${centerY - radius - 10} L ${centerX} ${centerY - radius - 30} L ${centerX + 10} ${centerY - radius - 10}`)
      .attr('fill', 'none')
      .attr('stroke', '#d1d5db')
      .attr('stroke-width', 2);

    // Color scale for contributions
    const maxContribution = Math.max(...Object.values(explanation.channel_contributions));
    const colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
      .domain([maxContribution, -maxContribution]);

    // Draw electrodes
    Object.entries(explanation.channel_contributions).forEach(([channel, contribution]) => {
      const pos = electrodePositions[channel];
      if (!pos) return;

      g.append('circle')
        .attr('cx', pos.x)
        .attr('cy', pos.y)
        .attr('r', Math.abs(contribution) * 20 + 5) // Size based on contribution magnitude
        .attr('fill', colorScale(contribution))
        .attr('opacity', 0.8)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2);

      g.append('text')
        .attr('x', pos.x)
        .attr('y', pos.y)
        .attr('dy', '0.35em')
        .style('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('font-weight', 'bold')
        .style('fill', Math.abs(contribution) > 0.5 ? 'white' : 'black')
        .text(channel);
    });

    // Add legend
    const legend = g.append('g')
      .attr('transform', `translate(${width - 150}, 50)`);

    legend.append('text')
      .attr('x', 0)
      .attr('y', -10)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Contribution');

    const legendScale = d3.scaleLinear()
      .domain([-maxContribution, maxContribution])
      .range([0, 100]);

    const legendAxis = d3.axisRight(legendScale)
      .tickSize(6)
      .ticks(5);

    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'contribution-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.selectAll('stop')
      .data(d3.range(0, 1.1, 0.1))
      .enter().append('stop')
      .attr('offset', d => d * 100 + '%')
      .attr('stop-color', d => colorScale(maxContribution - (d * 2 * maxContribution)));

    legend.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 20)
      .attr('height', 100)
      .style('fill', 'url(#contribution-gradient)');

    legend.append('g')
      .attr('transform', 'translate(20, 0)')
      .call(legendAxis);

  }, [explanation]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-green-600';
    if (confidence > 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPredictionBadgeVariant = (confidence: number) => {
    if (confidence > 0.8) return 'default';
    if (confidence > 0.6) return 'secondary';
    return 'destructive';
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Brain className="h-12 w-12 animate-pulse mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Generating explanation...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <Button onClick={() => resultId && fetchExplanation(resultId)}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!explanation) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <Eye className="h-12 w-12 mx-auto mb-4" />
            <p>No explanation data available</p>
            <p className="text-sm mt-1">Select a prediction result to view AI explanation</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Prediction Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <CardTitle>AI Model Explanation</CardTitle>
            </div>
            <Badge variant={getPredictionBadgeVariant(explanation.confidence_score)}>
              {explanation.prediction_class}
            </Badge>
          </div>
          <CardDescription>
            Understanding how the AI model made its prediction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className={cn("text-3xl font-bold", getConfidenceColor(explanation.confidence_score))}>
                {(explanation.confidence_score * 100).toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">Confidence Score</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {explanation.influential_segments.length}
              </div>
              <p className="text-sm text-muted-foreground">Key Time Segments</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {Object.keys(explanation.channel_contributions).length}
              </div>
              <p className="text-sm text-muted-foreground">Active Channels</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Explanation Tabs */}
      <Tabs defaultValue="features" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="features">Feature Importance</TabsTrigger>
          <TabsTrigger value="channels">Channel Contributions</TabsTrigger>
          <TabsTrigger value="timeline">Temporal Analysis</TabsTrigger>
          <TabsTrigger value="insights">Key Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Feature Importance Analysis
              </CardTitle>
              <CardDescription>
                Shows which features contributed most to the prediction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <svg ref={featureImportanceRef} width={600} height={300}></svg>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                EEG Channel Contributions
              </CardTitle>
              <CardDescription>
                Topographic map showing each electrode's contribution to the prediction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <svg ref={channelContributionRef} width={600} height={400}></svg>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Temporal Analysis
              </CardTitle>
              <CardDescription>
                Time segments that most influenced the prediction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {explanation.influential_segments
                  .sort((a, b) => b.importance_score - a.importance_score)
                  .slice(0, 5)
                  .map((segment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-semibold">
                          {segment.start_time.toFixed(3)}s - {segment.end_time.toFixed(3)}s
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Channel: {segment.channel}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {(segment.importance_score * 100).toFixed(1)}%
                        </div>
                        <Progress value={segment.importance_score * 100} className="w-24" />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Key Insights
              </CardTitle>
              <CardDescription>
                Human-readable explanation of the AI decision
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Primary Factors</h4>
                  <p className="text-blue-800">
                    The model's prediction is primarily based on patterns in channels{' '}
                    {Object.entries(explanation.channel_contributions)
                      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                      .slice(0, 3)
                      .map(([channel]) => channel)
                      .join(', ')}.
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">Confidence Assessment</h4>
                  <p className="text-green-800">
                    With {(explanation.confidence_score * 100).toFixed(1)}% confidence, this prediction is 
                    {explanation.confidence_score > 0.8 ? ' highly reliable' : 
                     explanation.confidence_score > 0.6 ? ' moderately reliable' : ' less certain'}.
                    {explanation.confidence_score < 0.7 && ' Consider additional analysis or expert review.'}
                  </p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-2">Temporal Patterns</h4>
                  <p className="text-purple-800">
                    Critical decision points occurred at{' '}
                    {explanation.influential_segments
                      .sort((a, b) => b.importance_score - a.importance_score)
                      .slice(0, 2)
                      .map(s => `${s.start_time.toFixed(2)}s`)
                      .join(' and ')}, 
                    suggesting {explanation.prediction_class.toLowerCase()} patterns in these time windows.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}