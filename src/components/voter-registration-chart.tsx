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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Voter } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Skeleton } from './ui/skeleton';

const processVoterData = (voters: Voter[] | null) => {
  if (!voters) {
    return [];
  }
  const monthlyCounts: { [key: string]: number } = {};

  const currentYear = new Date().getFullYear();

  const chartData = [
    { month: 'Jan', registrations: 0 },
    { month: 'Feb', registrations: 0 },
    { month: 'Mar', registrations: 0 },
    { month: 'Apr', registrations: 0 },
    { month: 'May', registrations: 0 },
    { month: 'Jun', registrations: 0 },
    { month: 'Jul', registrations: 0 },
    { month: 'Aug', registrations: 0 },
    { month: 'Sep', registrations: 0 },
    { month: 'Oct', registrations: 0 },
    { month: 'Nov', registrations: 0 },
    { month: 'Dec', registrations: 0 },
  ];

  voters.forEach(voter => {
    try {
      const date = parseISO(voter.registrationDate);
      if (date.getFullYear() === currentYear) {
        const month = format(date, 'MMM');
        const entry = chartData.find(d => d.month === month);
        if (entry) {
          entry.registrations++;
        }
      }
    } catch (e) {
        console.error("Invalid date format for voter", voter)
    }
  });
  
  return chartData;
}


export function VoterRegistrationChart({ isLoading }: { isLoading: boolean }) {
  const firestore = useFirestore();
  const { data: voters, isLoading: votersLoading } = useCollection<Voter>(
    useMemoFirebase(() => firestore ? collection(firestore, 'voters') : null, [firestore])
  );
  
  const voterRegistrationChartData = processVoterData(voters);
  
  const anyLoading = isLoading || votersLoading;

  if (anyLoading) {
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
