
"use client"
import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type { Task, User, ManagedList } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';

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
  normal: "bg-blue-500 hover:bg-blue-600",
  alta: "bg-orange-500 hover:bg-orange-600",
  urgente: "bg-red-500 hover:bg-red-600",
};

const statusColors: Record<string, string> = {
    pendiente: "bg-gray-500",
    en_curso: "bg-blue-500",
    finalizada: "bg-green-500",
}


const TaskCard = ({ task, user, onEdit, onDelete, onView }: { task: Task, user?: User, onEdit: () => void, onDelete: () => void, onView: () => void }) => {
    
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const isOverdue = dueDate < now && task.status !== 'finalizada';

    return (
        <Card className="mb-4 bg-card hover:bg-muted/50 transition-colors duration-200">
            <CardHeader className="p-4">
                <CardTitle className="text-base font-semibold">{task.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
                <div className="flex items-center justify-between text-sm">
                    <Badge className={cn("capitalize", priorityClasses[task.priority] || "bg-gray-500")}>
                        {task.priority}
                    </Badge>
                     {user && (
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{`${user.firstName} ${user.lastName}`}</span>
                            <Avatar className="h-6 w-6 text-xs">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>{user.firstName.charAt(0)}{user.lastName.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">
                    {task.description}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className={cn(isOverdue && "text-red-500 font-semibold")}>
                        {format(dueDate, "dd MMM, yyyy")}
                    </span>
                    <span>{formatDistanceToNow(new Date(task.startDate), { addSuffix: true, locale: es })}</span>
                </div>
                 <div className="flex justify-end gap-1 border-t pt-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onView}><Eye className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Edit className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}><Trash2 className="h-4 w-4"/></Button>
                </div>
            </CardContent>
        </Card>
    )
}

const KanbanColumn = ({ status, tasks, users, onEditTask, onDeleteTask, onViewTask }: { status: string, tasks: Task[], users: User[], onEditTask: (task: Task) => void, onDeleteTask: (task: Task) => void, onViewTask: (task: Task) => void }) => {
    
    const getUser = (userId: string) => users.find(u => u.id === userId);

    return (
        <div className="w-full md:w-1/3 flex-shrink-0">
            <Card className="bg-muted/50">
                <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <span className={cn("h-3 w-3 rounded-full", statusColors[status.toLowerCase().replace(/\s/g, '_')])}></span>
                            <h3 className="font-semibold capitalize">{status.replace(/_/g, ' ')}</h3>
                         </div>
                        <Badge variant="secondary">{tasks.length}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-2 h-[65vh] overflow-y-auto">
                    {tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                >
                                    <TaskCard 
                                        task={task} 
                                        user={getUser(task.assignedToId)}
                                        onEdit={() => onEditTask(task)}
                                        onDelete={() => onDeleteTask(task)}
                                        onView={() => onViewTask(task)}
                                    />
                                </div>
                            )}
                        </Draggable>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}

export const KanbanBoard = ({ tasks, users, lists, isLoading, onEditTask, onDeleteTask, onViewTask }: KanbanBoardProps) => {

    const onDragEnd = (result: any) => {
        // TODO: Handle task status change on drag and drop
        console.log(result);
    };

    const taskStatuses = lists.taskStatuses?.items || ['pendiente', 'en_curso', 'finalizada'];

    const columns = taskStatuses.map(status => ({
        id: status,
        title: status.replace(/_/g, ' '),
        tasks: tasks.filter(task => task.status === status),
    }));

    if (isLoading) {
        return (
            <div className="flex gap-4">
                {[1,2,3].map(i => (
                     <div key={i} className="w-full md:w-1/3 flex-shrink-0">
                        <Card className="bg-muted/50">
                             <CardHeader className="p-4">
                                <Skeleton className="h-6 w-3/4" />
                            </CardHeader>
                            <CardContent className="p-2 space-y-4">
                                <Skeleton className="h-40 w-full" />
                                <Skeleton className="h-40 w-full" />
                            </CardContent>
                        </Card>
                     </div>
                ))}
            </div>
        )
    }

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto">
                {columns.map(column => (
                    <Droppable key={column.id} droppableId={column.id}>
                        {(provided) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="w-full md:w-1/3 flex-shrink-0"
                            >
                                <KanbanColumn 
                                    status={column.id}
                                    tasks={column.tasks}
                                    users={users}
                                    onEditTask={onEditTask}
                                    onDeleteTask={onDeleteTask}
                                    onViewTask={onViewTask}
                                />
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                ))}
            </div>
        </DragDropContext>
    );
};
