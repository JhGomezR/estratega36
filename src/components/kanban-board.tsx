"use client"
import React from 'react';
import type { Task, User, ManagedList } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';
import { Skeleton } from './ui/skeleton';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


interface KanbanBoardProps {
    tasks: Task[];
    users: User[];
    lists: Record<string, ManagedList | undefined>;
    isLoading: boolean;
    onEditTask: (task: Task) => void;
    onDeleteTask: (task: Task) => void;
    onViewTask: (task: Task) => void;
}

const priorityClasses: Record<string, string> = {
  normal: "bg-blue-500 hover:bg-blue-600 text-white",
  alta: "bg-orange-500 hover:bg-orange-600 text-white",
  urgente: "bg-red-500 hover:bg-red-600 text-white",
};

const statusColors: Record<string, string> = {
    pendiente: "bg-gray-500",
    en_curso: "bg-blue-500",
    finalizada: "bg-green-500",
}


const TaskCard = ({ task, user, allStatuses, onEdit, onDelete, onView, onStatusChange }: { task: Task, user?: User, allStatuses: string[], onEdit: () => void, onDelete: () => void, onView: () => void, onStatusChange: (newStatus: string) => void }) => {
    
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const isOverdue = isPast(dueDate) && task.status !== 'finalizada';

    return (
        <Card className="mb-4 bg-card hover:bg-muted/50 transition-colors duration-200 shadow-sm">
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-sm pr-2">{task.title}</h4>
                     {user && (
                        <Avatar className="h-7 w-7 text-xs">
                            <AvatarImage src={user.avatar} data-ai-hint="person portrait"/>
                            <AvatarFallback>{user.firstName.charAt(0)}{user.lastName.charAt(0)}</AvatarFallback>
                        </Avatar>
                    )}
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                    {task.description}
                </p>

                <div>
                     <Badge className={cn("capitalize text-xs", priorityClasses[task.priority] || "bg-gray-500")}>
                        {task.priority}
                    </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span className={cn("font-medium", isOverdue && "text-red-500")}>
                        {format(dueDate, "dd MMM, yyyy")}
                    </span>
                    <div className="flex items-center">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreVertical className="h-4 w-4"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                <DropdownMenuItem onClick={onView}><Eye className="mr-2"/>Ver Detalles</DropdownMenuItem>
                                <DropdownMenuItem onClick={onEdit}><Edit className="mr-2"/>Editar</DropdownMenuItem>
                                <DropdownMenuItem onClick={onDelete} className="text-red-500 focus:text-red-500"><Trash2 className="mr-2"/>Eliminar</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>Mover a</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        {allStatuses.filter(s => s !== task.status).map(status => (
                                            <DropdownMenuItem key={status} onClick={() => onStatusChange(status)} className="capitalize">
                                                {status.replace(/_/g, ' ')}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export const KanbanBoard = ({ tasks, users, lists, isLoading, onEditTask, onDeleteTask, onViewTask }: KanbanBoardProps) => {
    const firestore = useFirestore();

    const handleStatusChange = (task: Task, newStatus: string) => {
        if (firestore) {
            setDocumentNonBlocking(doc(firestore, 'tasks', task.id), { status: newStatus }, { merge: true });
        }
    };

    const taskStatuses = lists.taskStatuses?.items || ['pendiente', 'en_curso', 'finalizada'];

    if (isLoading) {
        return (
            <div className="flex gap-6">
                {[1,2,3].map(i => (
                     <div key={i} className="flex-1">
                        <Card className="bg-muted/50">
                             <CardHeader className="p-4 border-b">
                                <Skeleton className="h-6 w-3/4" />
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <Skeleton className="h-32 w-full" />
                                <Skeleton className="h-32 w-full" />
                            </CardContent>
                        </Card>
                     </div>
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {taskStatuses.map(status => {
                const columnTasks = tasks.filter(task => task.status === status);
                return (
                     <div key={status} className="flex flex-col">
                        <Card className="bg-muted/50 border-t-4" style={{borderTopColor: statusColors[status.toLowerCase().replace(/\s/g, '_')]}}>
                            <CardHeader className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold capitalize text-base">{status.replace(/_/g, ' ')}</h3>
                                    </div>
                                    <Badge variant="secondary">{columnTasks.length}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-2 h-[65vh] overflow-y-auto">
                                <div className="px-2">
                                {columnTasks.map((task) => {
                                    const user = users.find(u => u.id === task.assignedToId);
                                    return (
                                        <TaskCard 
                                            key={task.id}
                                            task={task} 
                                            user={user}
                                            allStatuses={taskStatuses}
                                            onEdit={() => onEditTask(task)}
                                            onDelete={() => onDeleteTask(task)}
                                            onView={() => onViewTask(task)}
                                            onStatusChange={(newStatus) => handleStatusChange(task, newStatus)}
                                        />
                                    )
                                })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )
            })}
        </div>
    );
};
