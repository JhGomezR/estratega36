"use client"

import React from 'react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import { type Voter } from '@/lib/types';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, subWeeks, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';

const processDailyVoterData = (voters: Voter[] | undefined) => {
  if (!voters) {
    return [];
  }

  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
  const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 1 });
  const startOfPreviousWeek = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
  const endOfPreviousWeek = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });

  const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  const chartData = daysOfWeek.map(day => ({
    day,
    "Semana Actual": 0,
    "Semana Anterior": 0,
  }));

  voters.forEach(voter => {
    try {
      const registrationDate = new Date(voter.registrationDate);
      const dayIndex = (getDay(registrationDate) + 6) % 7; // Monday = 0, Sunday = 6
      
      if (registrationDate >= startOfCurrentWeek && registrationDate <= endOfCurrentWeek) {
        chartData[dayIndex]["Semana Actual"]++;
      } else if (registrationDate >= startOfPreviousWeek && registrationDate <= endOfPreviousWeek) {
        chartData[dayIndex]["Semana Anterior"]++;
      }

    } catch (e) {
      console.error("Invalid date format for voter", voter);
    }
  });

  return chartData;
};


export function WeeklyVoterChart({ voters, isLoading }: { voters: Voter[] | undefined, isLoading: boolean }) {
  
  const chartData = React.useMemo(() => processDailyVoterData(voters), [voters]);

  if(isLoading) {
      return <Skeleton className="h-[300px] w-full" />
  }

  return (
    <ChartContainer config={{
      "Semana Actual": {
        label: "Semana Actual",
        color: "hsl(var(--chart-1))",
      },
      "Semana Anterior": {
        label: "Semana Anterior",
        color: "hsl(var(--chart-2))",
      },
    }} className="h-[300px] w-full">
      <AreaChart 
        data={chartData} 
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
          <CartesianGrid
              vertical={false}
              strokeDasharray="4 4"
              stroke="hsl(var(--border))"
          />
          <XAxis
              dataKey="day"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <YAxis
             allowDecimals={false}
             tickLine={false}
             axisLine={false}
             tickMargin={10}
             tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent 
                indicator="dot"
              />}
          />
          <defs>
            <linearGradient id="fillSemanaActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-Semana Actual)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="var(--color-Semana Actual)" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="fillSemanaAnterior" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-Semana Anterior)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-Semana Anterior)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area 
            dataKey="Semana Anterior" 
            type="monotone" 
            fill="url(#fillSemanaAnterior)" 
            stroke="var(--color-Semana Anterior)" 
            stackId="a" 
            strokeDasharray="3 3"
          />
          <Area 
            dataKey="Semana Actual" 
            type="monotone" 
            fill="url(#fillSemanaActual)" 
            stroke="var(--color-Semana Actual)" 
            stackId="b" 
          />
      </AreaChart>
    </ChartContainer>
  )
}
