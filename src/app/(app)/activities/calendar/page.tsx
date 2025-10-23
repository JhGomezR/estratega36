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
import { isSameDay, parseISO, isWithinInterval, addMonths, subMonths, format, isToday } from 'date-fns'
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

type TaskWithRenderInfo = Task & { start: Date; due: Date; level: number };

function DayWithTasks({
  date,
  dayTasks,
  month,
  onTaskClick,
  onMoreClick,
}: {
  date: Date;
  dayTasks: TaskWithRenderInfo[];
  month: Date;
  onTaskClick: (task: Task) => void;
  onMoreClick: (date: Date) => void;
}) {
  const MAX_VISIBLE_TASKS = 3;
  const tasksToShow = dayTasks.slice(0, MAX_VISIBLE_TASKS);
  const hiddenTasksCount = dayTasks.length > MAX_VISIBLE_TASKS ? dayTasks.length - MAX_VISIBLE_TASKS : 0;

  const isOutsideMonth = date.getMonth() !== month.getMonth();
  const isCurrentDay = isToday(date);

  return (
    <div className="relative h-full w-full p-1 flex flex-col items-start justify-start">
      <div className="flex items-center gap-2 self-start mb-1">
        <time dateTime={format(date, "yyyy-MM-dd")} className={`text-xs ${isOutsideMonth ? 'text-muted-foreground' : ''}`}>
            {format(date, "d")}
        </time>
        {isCurrentDay && <Badge variant="secondary" className="px-1.5 py-0 text-xs">Hoy</Badge>}
      </div>

      <div className="w-full flex-grow flex flex-col space-y-px">
        {tasksToShow.map(task => (
          <div 
            key={task.id} 
            className="h-4"
            style={task.level > 0 ? { marginTop: '3px' } : undefined}
          >
            {isWithinInterval(date, { start: task.start, end: task.due }) && (
              <button
                onClick={() => onTaskClick(task)}
                className={
                  `h-full w-full text-xs text-left px-1 truncate ${priorityClasses[task.priority]} 
                   ${isSameDay(date, task.start) || date.getDay() === 1 ? 'rounded-l-sm' : ''}
                   ${isSameDay(date, task.due) || date.getDay() === 0 ? 'rounded-r-sm' : ''}
                   ${date.getDay() !== 1 && !isSameDay(date, task.start) ? 'rounded-l-none' : ''}
                   ${date.getDay() !== 0 && !isSameDay(date, task.due) ? 'rounded-r-none' : ''}`
                }
              >
                {(isSameDay(date, task.start) || (date.getDay() === 1 && date > task.start)) && (task.title.length > 15 ? task.title.slice(0, 15) + '...' : task.title) }
              </button>
            )}
          </div>
        ))}
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
  );
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
            return { ...task, start: parseISO(task.startDate), due: parseISO(task.dueDate), level: 0 };
        } catch { return null; }
    }).filter(Boolean) as TaskWithRenderInfo[];
    
    parsedTasks.sort((a, b) => a.start.getTime() - b.start.getTime() || b.due.getTime() - a.due.getTime());

    const levels: (Date | null)[] = [];
    for (const task of parsedTasks) {
        let placed = false;
        for (let i = 0; i < levels.length; i++) {
            if (!levels[i] || levels[i]! < task.start) {
                levels[i] = task.due;
                task.level = i;
                placed = true;
                break;
            }
        }
        if (!placed) {
            levels.push(task.due);
            task.level = levels.length - 1;
        }
    }
    
    return parsedTasks;
  }, [tasksData]);


  const getTasksForDay = (date: Date): TaskWithRenderInfo[] => {
    return tasks.filter(task => isWithinInterval(date, { start: task.start, end: task.due }));
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
            locale={es}
            weekStartsOn={1}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            components={{
              Day: ({ date, month }) => {
                if (isLoading) {
                  return <div className="h-full w-full p-1"><time>{format(date, "d")}</time></div>
                }
                const dayTasks = getTasksForDay(date);
                return <DayWithTasks date={date} dayTasks={dayTasks} month={month || currentMonth} onTaskClick={handleTaskClick} onMoreClick={handleMoreClick} />
              },
            }}
            className="w-full p-0 [&_td]:p-0 [&_th]:p-2 [&_button]:h-full [&_button]:w-full [&_button]:rounded-none"
             classNames={{
              caption: "hidden",
              nav: "hidden",
              root: "w-full text-sm",
              months: "w-full",
              month: "w-full space-y-0",
              table: "w-full border-collapse",
              head_row: "flex justify-between border-b",
              head_cell: "w-full text-muted-foreground rounded-md font-normal text-[0.8rem] uppercase",
              row: "flex w-full mt-0 justify-between border-b h-[120px]",
              cell: "h-auto w-full text-left text-sm p-0 relative focus-within:relative focus-within:z-20 border-r last:border-r-0",
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
                className="w-full justify-start h-auto py-2"
                onClick={() => {
                  setMoreTasksInfo(null);
                  handleTaskClick(task);
                }}
              >
                <div className="flex items-start w-full gap-2">
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 mt-1.5 ${priorityClasses[task.priority]}`}></span>
                  <span className="flex-1 text-left whitespace-normal">{task.title}</span>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
