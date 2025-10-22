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

const processVoterData = (voters: Voter[] | null) => {
  if (!voters) {
    return [];
  }
  const monthlyCounts: { [key: string]: number } = {};

  voters.forEach(voter => {
    // Assuming voter.registrationDate is in "yyyy-MM-dd" format
    try {
      const date = parseISO(voter.registrationDate);
      const month = format(date, 'MMM'); // 'Jan', 'Feb', etc.
      monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
    } catch (e) {
        console.error("Invalid date format for voter", voter)
    }
  });
  
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

  for(const month in monthlyCounts) {
      const entry = chartData.find(d => d.month === month);
      if(entry) {
          entry.registrations = monthlyCounts[month];
      }
  }

  return chartData;
}


export function VoterRegistrationChart() {
  const firestore = useFirestore();
  const { data: voters } = useCollection<Voter>(
    useMemoFirebase(() => firestore ? collection(firestore, 'voters') : null, [firestore])
  );
  
  const voterRegistrationChartData = processVoterData(voters);

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
