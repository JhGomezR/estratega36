"use client"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts"
import { voterRegistrationChartData } from "@/lib/data"

export function VoterRegistrationChart() {
  return (
    <ChartContainer config={{
      registrations: {
        label: "Registros",
        color: "hsl(var(--primary))",
      },
    }} className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
          <BarChart data={voterRegistrationChartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
              />
              <YAxis />
              <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
              />
              <Bar dataKey="registrations" fill="var(--color-registrations)" radius={4} />
          </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
