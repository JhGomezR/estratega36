
"use client"
import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlusCircle, Edit, Trash2, Eye, LayoutGrid, List, Search, ChevronLeft, ChevronRight } from "lucide-react"
import type { Task, User, ManagedList } from "@/lib/types"
import { TaskForm } from "@/components/task-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCollection, useFirestore, useMemoFirebase, useTenant } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { addDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { KanbanBoard } from "@/components/kanban-board"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"

const priorityClasses: Record<string, string> = {
  normal: "bg-blue-500 hover:bg-blue-600",
  alta: "bg-orange-500 hover:bg-orange-600",
  urgente: "bg-red-500 hover:bg-red-600",
};

const TASKS_PER_PAGE = 15;

export default function TasksPage() {
  const firestore = useFirestore();
  const tenantId = useTenant();

  const tasksCollectionRef = useMemoFirebase(() => tenantId ? collection(firestore, `tenants/${tenantId}/tasks`) : null, [firestore, tenantId]);
  const usersCollectionRef = useMemoFirebase(() => tenantId ? collection(firestore, `tenants/${tenantId}/users`) : null, [firestore, tenantId]);
  const listsCollectionRef = useMemoFirebase(() => tenantId ? collection(firestore, `tenants/${tenantId}/lists`) : null, [firestore, tenantId]);

  const { data: tasksData, isLoading: tasksLoading } = useCollection<Task>(tasksCollectionRef);
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersCollectionRef);
  const { data: managedLists, isLoading: listsLoading } = useCollection<ManagedList>(listsCollectionRef);
  
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [taskToDelete, setTaskToDelete] = React.useState<Task | null>(null);
  const [taskToView, setTaskToView] = React.useState<Task | null>(null);
  const [view, setView] = React.useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);

  const tasks = React.useMemo(() => {
      return tasksData?.filter(t => t.status !== 'archivada');
  }, [tasksData]);

  const lists = React.useMemo(() => {
    const listsMap: Record<string, ManagedList | undefined> = {};
    if (managedLists) {
        managedLists.forEach(list => {
            listsMap[list.id] = list;
        });
    }
    return listsMap;
  }, [managedLists]);

  const getUser = (userId: string) => {
    return users?.find(u => u.id === userId);
  };
  
  const getUserName = (userId: string) => {
    const user = getUser(userId);
    return user ? `${user.firstName} ${user.lastName}` : 'N/A';
  };

  const filteredTasks = React.useMemo(() => {
    if (!tasks) return [];
    if (!searchQuery) return tasks;

    const lowercasedQuery = searchQuery.toLowerCase();

    return tasks.filter(task => {
      const taskTitle = task.title.toLowerCase();
      const assignedUserName = getUserName(task.assignedToId).toLowerCase();

      return taskTitle.includes(lowercasedQuery) || assignedUserName.includes(lowercasedQuery);
    });
  }, [tasks, searchQuery, users]);

  const paginatedTasks = React.useMemo(() => {
    const startIndex = (currentPage - 1) * TASKS_PER_PAGE;
    return filteredTasks.slice(startIndex, startIndex + TASKS_PER_PAGE);
  }, [filteredTasks, currentPage]);

  const totalPages = Math.ceil(filteredTasks.length / TASKS_PER_PAGE);

  const handleAddNew = () => {
    setSelectedTask(null);
    setIsFormOpen(true);
  };

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setIsFormOpen(true);
  };
  
  const handleView = (task: Task) => {
    setTaskToView(task);
  }

  const confirmDelete = (task: Task) => {
    setTaskToDelete(task);
  };

  const handleDelete = () => {
    if (tasksCollectionRef && taskToDelete) {
      setDocumentNonBlocking(doc(tasksCollectionRef, taskToDelete.id), { status: 'archivada' }, { merge: true });
      setTaskToDelete(null);
    }
  };

  const handleFormSubmit = (data: Omit<Task, 'id' | 'startDate'>) => {
    if (tasksCollectionRef) {
      if (selectedTask) {
        setDocumentNonBlocking(doc(tasksCollectionRef, selectedTask.id), data, { merge: true });
      } else {
         addDocumentNonBlocking(tasksCollectionRef, {
          ...data,
          startDate: format(new Date(), "yyyy-MM-dd"),
        });
      }
    }
    setIsFormOpen(false);
  };
  
  const getUserInitials = (user?: User) => {
    if (!user) return 'NN'
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
  }

  const isLoading = tasksLoading || usersLoading || listsLoading;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Tareas</h1>
          <p className="text-muted-foreground">Organiza las tareas del equipo de campaña.</p>
        </div>
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 rounded-md bg-muted p-1">
                <Button variant={view === 'kanban' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('kanban')} className="gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Kanban
                </Button>
                <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('list')} className="gap-2">
                    <List className="h-4 w-4" />
                    Lista
                </Button>
            </div>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Tarea
            </Button>
        </div>
      </div>
      
     {view === 'list' && (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Lista de Tareas</CardTitle>
                <CardDescription>
                    Un listado de todas las tareas asignadas.
                </CardDescription>
            </div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="Buscar por tarea o persona..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Asignado a</TableHead>
                <TableHead>Fecha Límite</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Cargando...</TableCell>
                </TableRow>
              )}
              {!isLoading && paginatedTasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <p className="font-medium">No hay tareas para mostrar.</p>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? "Intenta con otra búsqueda." : "Crea una nueva tarea para empezar."}
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {paginatedTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>
                    <Badge className={cn("capitalize", priorityClasses[task.priority] || "bg-gray-500")}>
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>{getUserName(task.assignedToId)}</TableCell>
                  <TableCell>{task.dueDate}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        task.status === "finalizada"
                          ? "default"
                          : task.status === "en_curso"
                          ? "secondary"
                          : "outline"
                      }
                      className="capitalize"
                    >
                      {task.status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleView(task)}>
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(task)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => confirmDelete(task)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages > 0 ? totalPages : 1}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
      )}

      {view === 'kanban' && (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Kanban</CardTitle>
                    <CardDescription>
                        Visualización de tareas por estado.
                    </CardDescription>
                </div>
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                    placeholder="Buscar por tarea o persona..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <KanbanBoard 
                    tasks={filteredTasks}
                    users={users || []}
                    lists={lists}
                    isLoading={isLoading}
                    onEditTask={handleEdit}
                    onDeleteTask={confirmDelete}
                    onViewTask={handleView}
                />
            </CardContent>
        </Card>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedTask ? "Editar Tarea" : "Nueva Tarea"}</DialogTitle>
          </DialogHeader>
          <TaskForm
            task={selectedTask}
            users={users || []}
            lists={lists}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!taskToView} onOpenChange={(open) => !open && setTaskToView(null)}>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>{taskToView?.title}</DialogTitle>
                <DialogDescription>Detalles de la tarea</DialogDescription>
            </DialogHeader>
            {taskToView && (
                <div className="space-y-4 py-4">
                    <div className="space-y-1">
                        <span className="font-semibold text-sm">Descripción:</span>
                        <p className="text-sm text-muted-foreground">{taskToView.description || 'No hay descripción.'}</p>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="font-semibold text-sm">Asignado a:</span>
                            <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6 text-xs">
                                    <AvatarFallback>{getUserInitials(getUser(taskToView.assignedToId))}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{getUserName(taskToView.assignedToId)}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="font-semibold text-sm">Prioridad:</span>
                            <div>
                                <Badge className={cn("capitalize", priorityClasses[taskToView.priority] || "bg-gray-500")}>
                                    {taskToView.priority}
                                </Badge>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="font-semibold text-sm">Fecha Límite:</span>
                            <p className="text-sm">{format(new Date(taskToView.dueDate), "PPP")}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="font-semibold text-sm">Estado:</span>
                            <div>
                                <Badge variant={taskToView.status === "finalizada" ? "default" : taskToView.status === "en_curso" ? "secondary" : "outline"} className="capitalize">
                                    {taskToView.status.replace(/_/g, ' ')}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Esto marcará la tarea como archivada.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTaskToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Archivar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  )
}
