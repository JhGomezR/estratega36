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
import { format, parseISO, startOfWeek, endOfWeek, eachWeekOfInterval, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';

const processWeeklyVoterData = (voters: Voter[] | null) => {
  if (!voters || voters.length === 0) {
    return [];
  }
  
  const weeklyCounts: { [weekStart: string]: number } = {};

  const today = new Date();
  const weeks = eachWeekOfInterval({
    start: subWeeks(today, 11), // 12 weeks including current
    end: today
  }, { weekStartsOn: 1 });


  const weekLabels = weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    return `${format(weekStart, 'dd')}-${format(weekEnd, 'dd MMM')}`;
  });

  const chartData = weekLabels.map(label => ({ week: label, Votantes: 0 }));

  voters.forEach(voter => {
    try {
      const date = parseISO(voter.registrationDate);
      const startOfVoterWeek = startOfWeek(date, { weekStartsOn: 1 });
      
      const weekStartDateFormatted = `${format(startOfVoterWeek, 'dd')}-${format(endOfWeek(startOfVoterWeek, {weekStartsOn: 1}), 'dd MMM')}`;

      const weekIndex = chartData.findIndex(d => d.week === weekStartDateFormatted);

      if (weekIndex !== -1) {
          chartData[weekIndex].Votantes++;
      }

    } catch (e) {
        console.error("Invalid date format for voter", voter)
    }
  });

  return chartData;
}


export function WeeklyVoterChart({ voters, isLoading }: { voters: Voter[] | null, isLoading: boolean }) {
  
  const chartData = React.useMemo(() => processWeeklyVoterData(voters), [voters]);

  if(isLoading) {
      return <Skeleton className="h-[300px] w-full" />
  }

  return (
    <ChartContainer config={{
      Votantes: {
        label: "Votantes",
        color: "hsl(var(--chart-2))",
      },
    }} className="h-[300px] w-full">
      <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
              dataKey="week"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.split('-')[0]}
              
          />
          <YAxis
             tickLine={false}
             axisLine={false}
             tickMargin={10}
          />
          <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent 
                labelClassName="font-bold"
                formatter={(value, name, props) => (
                    <div className="flex flex-col">
                        <span>{props.payload.week}</span>
                        <span className="font-semibold mt-1">{name}: {value}</span>
                    </div>
                )}
              />}
          />
          <defs>
            <linearGradient id="fillVotantes" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-Votantes)"
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor="var(--color-Votantes)"
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>
          <Area dataKey="Votantes" type="natural" fill="url(#fillVotantes)" stroke="var(--color-Votantes)" stackId="a" />
      </AreaChart>
    </ChartContainer>
  )
}
