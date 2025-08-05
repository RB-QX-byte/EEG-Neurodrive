"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from 'lucide-react'

interface EEGWaveformChartProps {
  data: Array<{
    time: string
    [key: string]: number | string
  }>
  channels: string[]
  title?: string
  height?: number
}

const channelColors = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", 
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"
]

export function EEGWaveformChart({ 
  data, 
  channels, 
  title = "EEG Waveform", 
  height = 400 
}: EEGWaveformChartProps) {
  const chartConfig = channels.reduce((config, channel, index) => {
    config[channel] = {
      label: channel.replace('channel_', 'Ch '),
      color: channelColors[index % channelColors.length]
    }
    return config
  }, {} as any)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-medical-blue" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className={`h-[${height}px]`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={data} 
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {channels.map((channel, index) => (
                <Line
                  key={channel}
                  type="monotone"
                  dataKey={channel}
                  stroke={channelColors[index % channelColors.length]}
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}