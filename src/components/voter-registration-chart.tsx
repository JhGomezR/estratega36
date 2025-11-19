"use client"

import React from 'react';
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
} from "recharts"
import { type Voter } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Skeleton } from './ui/skeleton';

const processVoterData = (voters: Voter[] | undefined) => {
  if (!voters) {
    return [];
  }

  const currentYear = new Date().getFullYear();

  const chartData = [
    { month: 'Ene', registrations: 0 },
    { month: 'Feb', registrations: 0 },
    { month: 'Mar', registrations: 0 },
    { month: 'Abr', registrations: 0 },
    { month: 'May', registrations: 0 },
    { month: 'Jun', registrations: 0 },
    { month: 'Jul', registrations: 0 },
    { month: 'Ago', registrations: 0 },
    { month: 'Sep', registrations: 0 },
    { month: 'Oct', registrations: 0 },
    { month: 'Nov', registrations: 0 },
    { month: 'Dic', registrations: 0 },
  ];

  voters.forEach(voter => {
    try {
      const date = parseISO(voter.registrationDate);
      if (date.getFullYear() === currentYear) {
        const monthIndex = date.getMonth();
        chartData[monthIndex].registrations++;
      }
    } catch (e) {
        console.error("Invalid date format for voter", voter)
    }
  });
  
  return chartData;
}


export function VoterRegistrationChart({ voters, isLoading }: { voters: Voter[] | undefined, isLoading: boolean }) {
  
  const voterRegistrationChartData = processVoterData(voters);
  
  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />
  }

  return (
    <ChartContainer config={{
      registrations: {
        label: "Registros",
        color: "hsl(var(--primary))",
      },
    }} className="h-[300px] w-full">
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
    </ChartContainer>
  )
}
