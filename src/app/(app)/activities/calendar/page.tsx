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
import type { Task, User } from "@/lib/types"
import { addDays, eachDayOfInterval, format, isSameDay, parseISO, startOfWeek, getDay } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

const priorityClasses: Record<Task['priority'], string> = {
  normal: "bg-blue-500 hover:bg-blue-600 text-white",
  alta: "bg-orange-500 hover:bg-orange-600 text-white",
  urgente: "bg-red-500 hover:bg-red-600 text-white",
}

const priorityLabels: Record<Task['priority'], string> = {
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

const statusLabels: Record<Task['status'], string> = {
  pendiente: "Pendiente",
  en_curso: "En Curso",
  finalizada: "Finalizada",
};


function DayWithTasks({ 
    date, 
    tasks,
    onTaskClick,
  }: { 
    date: Date; 
    tasks: (Task & { start: Date; due: Date; span: number; level: number })[];
    onTaskClick: (task: Task) => void;
  }) {
    
  const dayTasks = tasks.filter(task => {
    const interval = { start: task.start, end: task.due }
    return isSameDay(date, task.start) || isSameDay(date, task.due) || (date > task.start && date < task.due);
  });

  const MAX_VISIBLE_TASKS = 2;
  const visibleTasks = dayTasks.slice(0, MAX_VISIBLE_TASKS);
  const hiddenTasksCount = dayTasks.length - MAX_VISIBLE_TASKS;

  const getWeekStart = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });

  return (
    <div className="relative h-full w-full p-1 flex flex-col items-start justify-start gap-1 overflow-hidden">
      <time dateTime={format(date, "yyyy-MM-dd")} className="self-start text-xs">{format(date, "d")}</time>
      <div className="w-full flex-grow space-y-0.5">
        {visibleTasks.map((task) => {
            const isStart = isSameDay(date, task.start);
            const isEnd = isSameDay(date, task.due);
            const weekStart = getWeekStart(date);
            const isStartOfWeek = isSameDay(date, weekStart) || isSameDay(date, addDays(weekStart, -1)); // Handle week starts on Sunday or Monday
            
            const showTitle = isStart || (isStartOfWeek && date >= task.start);

            const style = {
              marginTop: `${task.level * 1.5}rem`,
            };

            return (
              <div key={task.id} className="relative" style={style}>
                 <button
                    onClick={() => onTaskClick(task)}
                    className={`w-full text-xs p-0.5 h-5 leading-tight truncate text-left ${priorityClasses[task.priority]} 
                    ${isStart || (isStartOfWeek && date >= task.start) ? 'rounded-l-md' : ''}
                    ${isEnd ? 'rounded-r-md' : ''}
                    ${!isStart && !(isStartOfWeek && date >= task.start) && 'ml-[-1px]'}
                    ${!isEnd && 'mr-[-1px]'}
                    `}
                  >
                   {showTitle ? task.title : <>&nbsp;</>}
                  </button>
              </div>
            )
        })}
         {hiddenTasksCount > 0 && (
          <button className="text-xs text-muted-foreground mt-1 hover:underline">
            +{hiddenTasksCount} más
          </button>
        )}
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const firestore = useFirestore()
  const { data: tasksData, isLoading: tasksLoading } = useCollection<Task>(
    useMemoFirebase(() => firestore ? collection(firestore, "tasks") : null, [firestore])
  )
  const { data: users, isLoading: usersLoading } = useCollection<User>(
    useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore])
  );
  
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date())
  const [taskToView, setTaskToView] = React.useState<Task | null>(null);

  const tasks = React.useMemo(() => {
    if (!tasksData) return [];
  
    const parsedTasks = tasksData.map(task => {
        try {
            const start = parseISO(task.startDate);
            const due = parseISO(task.dueDate);
            if (start > due) return null; // Invalid date range
            const span = eachDayOfInterval({ start, end: due }).length;
            return { ...task, start, due, span, level: 0 };
        } catch {
            return null;
        }
    }).filter(Boolean) as (Task & { start: Date; due: Date; span: number; level: number })[];
  
    parsedTasks.sort((a, b) => a.start.getTime() - b.start.getTime() || b.span - a.span);
  
    const taskLevels: { task: typeof parsedTasks[0]; level: number }[] = [];
  
    for (const task of parsedTasks) {
      let level = 0;
      // Find the first level where the task does not overlap
      while (
        taskLevels.some(
          (t) =>
            t.level === level &&
            task.start < addDays(t.task.due, 1) &&
            addDays(task.due, 1) > t.task.start
        )
      ) {
        level++;
      }
      task.level = level;
      taskLevels.push({ task, level });
    }
  
    return parsedTasks;
  }, [tasksData]);
  

  const allTaskDates = React.useMemo(() => {
    if (!tasks) return []
    const dates: Date[] = []
    tasks.forEach(task => {
        try {
            const start = task.start;
            const due = task.due;
            if (start && due) {
                dates.push(...eachDayOfInterval({ start, end: due }))
            }
        } catch {}
    })
    return dates;
  }, [tasks])

  const getUserName = (userId: string) => {
    const user = users?.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'N/A';
  };

  const handleTaskClick = (task: Task) => {
    setTaskToView(task);
  }

  const isLoading = tasksLoading || usersLoading;

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
                if (isLoading) {
                  return <div className="h-full w-full p-1"><time>{format(date, "d")}</time></div>
                }
                return <DayWithTasks date={date} tasks={tasks || []} onTaskClick={handleTaskClick} />
              },
            }}
            className="w-full p-0 [&_td]:p-0 [&_th]:p-2 [&_button]:h-full [&_button]:w-full [&_button]:rounded-none"
             classNames={{
              root: "w-full text-sm",
              months: "w-full",
              month: "w-full space-y-2",
              table: "w-full border-collapse",
              head_row: "flex justify-between border-b",
              head_cell: "w-full text-muted-foreground rounded-md font-normal text-[0.8rem] uppercase",
              row: "flex w-full mt-2 justify-between border-b",
              cell: "h-36 w-full text-left text-sm p-0 relative focus-within:relative focus-within:z-20 border-r last:border-r-0",
              day: "h-full w-full p-0 font-normal aria-selected:opacity-100 justify-start items-start flex",
              day_selected: "",
              day_today: "bg-accent/50 text-accent-foreground",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
            }}
          />
        </CardContent>
      </Card>
      
      <Dialog open={!!taskToView} onOpenChange={(open) => !open && setTaskToView(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{taskToView?.title}</DialogTitle>
            <DialogDescription>Detalles de la tarea</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 items-center gap-4">
                  <span className="font-semibold text-sm">Descripción:</span>
                  <p className="col-span-2 text-sm text-muted-foreground">{taskToView?.description || 'No hay descripción.'}</p>
              </div>
              <Separator />
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="font-semibold text-sm">Asignado a:</span>
                  <span className="col-span-2">{getUserName(taskToView?.assignedToId || '')}</span>
              </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="font-semibold text-sm">Fecha de Inicio:</span>
                  <span className="col-span-2">{taskToView?.startDate}</span>
              </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="font-semibold text-sm">Fecha Límite:</span>
                  <span className="col-span-2">{taskToView?.dueDate}</span>
              </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="font-semibold text-sm">Prioridad:</span>
                  <Badge className={`col-span-2 w-fit ${priorityClasses[taskToView?.priority || 'normal']}`}>
                    {priorityLabels[taskToView?.priority || 'normal']}
                  </Badge>
              </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="font-semibold text-sm">Estado:</span>
                  <Badge variant={
                          taskToView?.status === "finalizada" ? "default" : taskToView?.status === "en_curso" ? "secondary" : "outline"
                        } className="col-span-2 w-fit">
                    {statusLabels[taskToView?.status || 'pendiente']}
                  </Badge>
              </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
