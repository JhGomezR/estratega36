"use client"
import * as React from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"
import type { Task } from "@/lib/types"
import { addDays, eachDayOfInterval, format, isSameDay, parseISO } from 'date-fns'

const priorityClasses: Record<Task['priority'], string> = {
  normal: "bg-blue-500 hover:bg-blue-600 text-white",
  alta: "bg-orange-500 hover:bg-orange-600 text-white",
  urgente: "bg-red-500 hover:bg-red-600 text-white",
}

function DayWithTasks({ date, tasks }: { date: Date; tasks: Task[] }) {
  const dayTasks = tasks
    .map(task => {
        try {
            const start = parseISO(task.startDate)
            const due = parseISO(task.dueDate)
            return { ...task, start, due }
        } catch {
            return null
        }
    })
    .filter((task): task is Task & { start: Date; due: Date } => {
        if (!task) return false;
        const interval = { start: task.start, end: task.due }
        return isSameDay(date, task.start) || isSameDay(date, task.due) || (date > task.start && date < task.due);
    })

  return (
    <div className="relative h-full w-full p-1 flex flex-col items-start justify-start gap-1 overflow-hidden">
      <time dateTime={format(date, "yyyy-MM-dd")} className="self-start">{format(date, "d")}</time>
      <div className="w-full flex-grow space-y-1">
        {dayTasks.map((task) => {
            const isStart = isSameDay(date, task.start)
            const isEnd = isSameDay(date, task.due)
            const isMiddle = !isStart && !isEnd

            return (
              <div
                key={task.id}
                className={`w-full text-xs p-1 truncate text-left ${priorityClasses[task.priority]} 
                ${isStart ? 'rounded-l-lg' : ''}
                ${isEnd ? 'rounded-r-lg' : ''}
                ${!isStart && 'ml-[-1px]'}
                ${!isEnd && 'mr-[-1px]'}
                `}
              >
               {isStart ? task.title : <>&nbsp;</>}
              </div>
            )
        })}
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const firestore = useFirestore()
  const { data: tasks, isLoading: tasksLoading } = useCollection<Task>(
    useMemoFirebase(() => firestore ? collection(firestore, "tasks") : null, [firestore])
  )
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date())

  const allTaskDates = React.useMemo(() => {
    if (!tasks) return []
    const dates: Date[] = []
    tasks.forEach(task => {
        try {
            const start = parseISO(task.startDate);
            const due = parseISO(task.dueDate)
            if (start && due) {
                dates.push(...eachDayOfInterval({ start, end: due }))
            }
        } catch {}
    })
    return dates;
  }, [tasks])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendario de Actividades</h1>
        <p className="text-muted-foreground">Organiza y visualiza los eventos de tu campaña.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Calendar
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            modifiers={{
                taskDay: allTaskDates,
            }}
            modifiersClassNames={{
                taskDay: "has-task",
            }}
            components={{
              Day: ({ date }) => {
                if (tasksLoading) {
                  return <div className="h-full w-full p-1"><time>{format(date, "d")}</time></div>
                }
                return <DayWithTasks date={date} tasks={tasks || []} />
              },
            }}
            className="w-full p-0 [&_td]:p-0 [&_th]:p-2 [&_button]:h-full [&_button]:w-full [&_button]:rounded-none"
             classNames={{
              root: "w-full",
              months: "w-full",
              month: "w-full space-y-4",
              table: "w-full border-collapse",
              head_row: "flex justify-between border-b",
              head_cell: "w-full text-muted-foreground rounded-md font-normal text-[0.8rem] uppercase",
              row: "flex w-full mt-2 justify-between border-b",
              cell: "h-32 w-full text-left text-sm p-0 relative focus-within:relative focus-within:z-20 border-r",
              day: "h-full w-full p-0 font-normal aria-selected:opacity-100 justify-start items-start flex",
              day_selected: "",
              day_today: "bg-accent text-accent-foreground",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
