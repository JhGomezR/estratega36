
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
import { eachDayOfInterval, format, isSameDay, parseISO, startOfWeek, getDay, isWithinInterval, addMonths, subMonths, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

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

type TaskWithRenderInfo = Task & { start: Date; due: Date; span: number; level: number };

function DayWithTasks({ 
    date, 
    dayTasks,
    onTaskClick,
    onMoreClick,
  }: { 
    date: Date; 
    dayTasks: TaskWithRenderInfo[];
    onTaskClick: (task: Task) => void;
    onMoreClick: (date: Date) => void;
  }) {
    
  const MAX_VISIBLE_TASKS = 3;
  const visibleTasks = dayTasks.slice(0, MAX_VISIBLE_TASKS);
  const hiddenTasksCount = dayTasks.length - MAX_VISIBLE_TASKS;

  const dayOfWeek = getDay(date) === 0 ? 6 : getDay(date) - 1; // Monday = 0, Sunday = 6

  return (
    <div className="relative h-full w-full p-1 flex flex-col items-start justify-start gap-1 overflow-hidden">
      <time dateTime={format(date, "yyyy-MM-dd")} className="self-start text-xs">{format(date, "d")}</time>
      <div className="w-full flex-grow space-y-0.5">
        {visibleTasks.map((task) => {
            const isStartDay = isSameDay(date, task.start);
            const isBeginningOfWeek = dayOfWeek === 0;
            const shouldRenderTask = isStartDay || (isBeginningOfWeek && isWithinInterval(date, { start: task.start, end: task.due }));
            
            if (!shouldRenderTask) {
                return null;
            }

            const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
            const remainingDaysInTask = eachDayOfInterval({start: date, end: task.due}).length;
            const remainingDaysInWeek = eachDayOfInterval({start: date, end: weekEnd}).length;
            const span = Math.min(remainingDaysInTask, remainingDaysInWeek);
            
            const taskWidth = `calc(${span * 100}% - 4px)`;
            
            return (
              <div 
                key={task.id} 
                className="absolute w-full" 
                style={{ marginTop: `${task.level * 1.6}rem` }}
              >
                 <button
                    onClick={() => onTaskClick(task)}
                    className={`text-xs p-0.5 h-5 leading-tight truncate text-left ${priorityClasses[task.priority]} rounded-sm`}
                     style={{ width: taskWidth }}
                  >
                   {task.title}
                  </button>
              </div>
            )
        })}
        </div>
         {hiddenTasksCount > 0 && (
          <button 
            onClick={() => onMoreClick(date)} 
            className="text-xs font-semibold text-muted-foreground mt-auto pt-1 hover:underline self-start"
          >
            +{hiddenTasksCount} más
          </button>
        )}
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
  const [moreTasksInfo, setMoreTasksInfo] = React.useState<{ date: Date, tasks: Task[] } | null>(null);


  const tasks = React.useMemo(() => {
    if (!tasksData) return [];
  
    const parsedTasks = tasksData.map(task => {
        try {
            const start = parseISO(task.startDate);
            const due = parseISO(task.dueDate);
            if (start > due) return null;
            return { ...task, start, due, span: 0, level: 0 };
        } catch {
            return null;
        }
    }).filter(Boolean) as TaskWithRenderInfo[];
  
    parsedTasks.sort((a, b) => a.start.getTime() - b.start.getTime() || b.due.getTime() - a.due.getTime());
    
    // Assign levels to tasks to prevent visual overlap
    const daysWithTasks: Record<string, TaskWithRenderInfo[]> = {};
    
    parsedTasks.forEach(task => {
        let level = 0;
        const taskInterval = { start: task.start, end: task.due };
        const taskDays = eachDayOfInterval(taskInterval).map(d => format(d, 'yyyy-MM-dd'));

        // Find the first level where this task doesn't overlap with others
        while (
            taskDays.some(dayStr => 
                daysWithTasks[dayStr]?.some(existingTask => existingTask.level === level)
            )
        ) {
            level++;
        }
        task.level = level;

        // Place the task in the grid for each day it spans
        taskDays.forEach(dayStr => {
            if (!daysWithTasks[dayStr]) {
                daysWithTasks[dayStr] = [];
            }
            daysWithTasks[dayStr].push(task);
        });
    });

    return parsedTasks;

  }, [tasksData]);
  
  const getTasksForDay = (date: Date): TaskWithRenderInfo[] => {
    return tasks
      .filter(task => isWithinInterval(date, { start: task.start, end: task.due }))
      .sort((a, b) => a.level - b.level);
  }

  const getUserName = (userId: string) => {
    const user = users?.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'N/A';
  };

  const handleTaskClick = (task: Task) => {
    setTaskToView(task);
  }

  const handleMoreClick = (date: Date) => {
    const dailyTasks = getTasksForDay(date);
    setMoreTasksInfo({ date, tasks: dailyTasks });
  }
  
  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  const handleGoToToday = () => {
    setCurrentMonth(new Date());
  };


  const isLoading = tasksLoading || usersLoading;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendario de Actividades</h1>
            <p className="text-muted-foreground">Organiza y visualiza los eventos de tu campaña.</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={handleGoToToday}>Hoy</Button>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
        <h2 className="text-xl font-semibold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h2>
      </div>

      <Card>
        <CardContent className="p-0">
          <Calendar
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            components={{
              Day: ({ date }) => {
                if (isLoading) {
                  return <div className="h-full w-full p-1"><time>{format(date, "d")}</time></div>
                }
                const dayTasks = getTasksForDay(date);
                return <DayWithTasks date={date} dayTasks={dayTasks} onTaskClick={handleTaskClick} onMoreClick={handleMoreClick} />
              },
            }}
            className="w-full p-0 [&_td]:p-0 [&_th]:p-2 [&_button]:h-full [&_button]:w-full [&_button]:rounded-none"
             classNames={{
              caption: "hidden",
              nav: "hidden",
              root: "w-full text-sm",
              months: "w-full",
              month: "w-full space-y-2",
              table: "w-full border-collapse",
              head_row: "flex justify-between border-b",
              head_cell: "w-full text-muted-foreground rounded-md font-normal text-[0.8rem] uppercase",
              row: "flex w-full mt-2 justify-between border-b",
              cell: "h-48 w-full text-left text-sm p-0 relative focus-within:relative focus-within:z-20 border-r last:border-r-0",
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
                  <span className="col-span-2">{taskToView?.startDate ? format(parseISO(taskToView.startDate), 'PPP', { locale: es }) : 'N/A'}</span>
              </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <span className="font-semibold text-sm">Fecha Límite:</span>
                  <span className="col-span-2">{taskToView?.dueDate ? format(parseISO(taskToView.dueDate), 'PPP', { locale: es }) : 'N/A'}</span>
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

      <Dialog open={!!moreTasksInfo} onOpenChange={(open) => !open && setMoreTasksInfo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tareas del {moreTasksInfo?.date ? format(moreTasksInfo.date, 'PPP', { locale: es }) : ''}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            {moreTasksInfo?.tasks.map(task => (
              <Button
                key={task.id}
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => {
                  setMoreTasksInfo(null);
                  handleTaskClick(task);
                }}
              >
                <span className={`h-2 w-2 rounded-full ${priorityClasses[task.priority]}`}></span>
                <span className="flex-1 truncate text-left">{task.title}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
