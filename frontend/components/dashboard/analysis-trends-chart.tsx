"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

interface AnalysisTrendsChartProps {
  data: Array<{
    date: string
    completed: number
    failed: number
    processing: number
  }>
}

const chartConfig = {
  completed: {
    label: "Completed",
    color: "#10B981"
  },
  failed: {
    label: "Failed", 
    color: "#EF4444"
  },
  processing: {
    label: "Processing",
    color: "#3B82F6"
  }
}

export function AnalysisTrendsChart({ data }: AnalysisTrendsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-medical-blue" />
          <span>Analysis Trends (Last 7 Days)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar 
                dataKey="completed" 
                fill="var(--color-completed)" 
                radius={[2, 2, 0, 0]} 
              />
              <Bar 
                dataKey="processing" 
                fill="var(--color-processing)" 
                radius={[2, 2, 0, 0]} 
              />
              <Bar 
                dataKey="failed" 
                fill="var(--color-failed)" 
                radius={[2, 2, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}