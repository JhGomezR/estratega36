
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
import { Edit, Eye, Loader2, Save, Search, Clock, CheckCircle, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useAuth, useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, writeBatch } from "firebase/firestore"
import type { Call, Voter, User } from "@/lib/types"
import { CallForm } from "@/components/call-form"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CallStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const statusLabels: Record<Call['status'], string> = {
  pendiente: "Pendiente",
  atendida: "Atendida",
};

const statusColors: Record<Call['status'], string> = {
  pendiente: 'bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30',
  atendida: 'bg-green-500/20 text-green-700 hover:bg-green-500/30'
}

const CALLS_PER_PAGE = 15;

export default function CallsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const callsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `calls`) : null, [firestore]);
  const votersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `voters`) : null, [firestore]);
  const usersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `users`) : null, [firestore]);

  const { data: callsData, isLoading: callsLoading } = useCollection<Call>(callsCollectionRef);
  const { data: voters, isLoading: votersLoading } = useCollection<Voter>(votersCollectionRef);
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersCollectionRef);

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [selectedCall, setSelectedCall] = React.useState<Call | null>(null);
  const [callDetails, setCallDetails] = React.useState("");
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [localAttempts, setLocalAttempts] = React.useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [callToDelete, setCallToDelete] = React.useState<Call | null>(null)


  const calls = React.useMemo(() => {
    if (!callsData) return [];
    return callsData.filter(c => c.status_call !== 'inactivo');
  }, [callsData]);

  React.useEffect(() => {
    if (calls) {
      const initialAttempts = calls.reduce((acc, call) => {
        acc[call.id] = call.attempts;
        return acc;
      }, {} as Record<string, number>);
      setLocalAttempts(initialAttempts);
    }
  }, [calls]);

  React.useEffect(() => {
    const syncCallList = async () => {
      if (!firestore || !voters || !callsData || !callsCollectionRef) return;

      setIsSyncing(true);
      try {
        const existingCallVoterIds = new Set(callsData.map(c => c.voterId));
        const votersToCall = voters.filter(v => v.status === 'activo' && !existingCallVoterIds.has(v.id));

        if (votersToCall.length > 0) {
          const batch = writeBatch(firestore);
          votersToCall.forEach(voter => {
            const newCallRef = doc(callsCollectionRef);
            batch.set(newCallRef, {
              voterId: voter.id,
              status: "pendiente",
              status_call: "activo",
              attempts: 0,
            });
          });

          await batch.commit();
          toast({
            title: "Lista de llamadas sincronizada",
            description: `Se agregaron ${votersToCall.length} nuevos votantes a la lista.`,
          });
        }
      } catch (error) {
        console.error("Error syncing call list:", error);
        toast({
          variant: "destructive",
          title: "Error de Sincronización",
          description: "No se pudo actualizar la lista de llamadas.",
        });
      } finally {
        setIsSyncing(false);
      }
    };

    syncCallList();
  }, [voters, callsData, firestore, toast, callsCollectionRef]);

  const getVoterInfo = React.useCallback((voterId: string) => {
    return voters?.find(v => v.id === voterId);
  }, [voters]);
  
  const getUserName = React.useCallback((userId?: string) => {
    if (!userId) return '';
    const user = users?.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Desconocido';
  }, [users]);


  const processedCalls = React.useMemo(() => {
    if (!calls) return [];

    const filtered = calls.filter(call => {
      if (!searchQuery) return true;
      const voter = getVoterInfo(call.voterId);
      const lowercasedQuery = searchQuery.toLowerCase();

      const nameMatch = voter ? `${voter.firstName} ${voter.lastName}`.toLowerCase().includes(lowercasedQuery) : false;
      const phoneMatch = voter?.phone ? voter.phone.toLowerCase().includes(lowercasedQuery) : false;
      const statusMatch = statusLabels[call.status].toLowerCase().includes(lowercasedQuery);
      const userMatch = getUserName(call.userId).toLowerCase().includes(lowercasedQuery);


      return nameMatch || phoneMatch || statusMatch || userMatch;
    });

    return filtered.sort((a, b) => {
      if (a.status === 'pendiente' && b.status !== 'pendiente') return -1;
      if (a.status !== 'pendiente' && b.status === 'pendiente') return 1;
      if (a.callDate && b.callDate) return new Date(b.callDate).getTime() - new Date(a.callDate).getTime();
      if (a.callDate) return -1;
      if (b.callDate) return 1;
      return 0;
    });
  }, [calls, searchQuery, getVoterInfo, getUserName]);

  const paginatedCalls = React.useMemo(() => {
    const startIndex = (currentPage - 1) * CALLS_PER_PAGE;
    return processedCalls.slice(startIndex, startIndex + CALLS_PER_PAGE);
  }, [processedCalls, currentPage]);

  const totalPages = Math.ceil(processedCalls.length / CALLS_PER_PAGE);

  const callStats = React.useMemo(() => {
    if (!calls) return { pending: 0, attended: 0 };
    return calls.reduce((acc, call) => {
      if (call.status === 'pendiente') acc.pending++;
      else if (call.status === 'atendida') acc.attended++;
      return acc;
    }, { pending: 0, attended: 0 });
  }, [calls]);


  const handleEdit = (call: Call) => {
    setSelectedCall(call);
    setIsFormOpen(true);
  };
  
  const handleView = (call: Call) => {
    setSelectedCall(call);
    setIsViewOpen(true);
  }

  const handleFormSubmit = (data: Omit<Call, 'id' | 'voterId' | 'callDate' | 'status_call'>) => {
    if (callsCollectionRef && selectedCall) {
      let callData: Partial<Call> = { ...data };
      if (data.status === 'atendida' && selectedCall.status !== 'atendida') {
        callData.callDate = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'");
      }
      setDocumentNonBlocking(doc(callsCollectionRef, selectedCall.id), callData, { merge: true });
    }
    setIsFormOpen(false);
  };

  const handleAttemptsBlur = (callId: string) => {
    if (callsCollectionRef && localAttempts[callId] !== undefined) {
      const originalCall = calls?.find(c => c.id === callId);
      if (originalCall && originalCall.attempts !== localAttempts[callId]) {
        setDocumentNonBlocking(doc(callsCollectionRef, callId), { attempts: localAttempts[callId] }, { merge: true });
      }
    }
  }

  const handleStatusChange = (call: Call, newStatus: Call['status']) => {
    if (newStatus === 'atendida') {
      if ((localAttempts[call.id] ?? call.attempts) < 1) {
        toast({
            variant: "destructive",
            title: "Acción no permitida",
            description: "La llamada debe tener al menos 1 intento para ser marcada como atendida.",
        });
        return;
      }
      setSelectedCall(call);
      setCallDetails("");
      setIsDetailsOpen(true);
    } else if (callsCollectionRef) {
      setDocumentNonBlocking(doc(callsCollectionRef, call.id), { status: newStatus }, { merge: true });
    }
  };

  const handleSaveDetails = () => {
    if (callsCollectionRef && selectedCall) {
      const callData: Partial<Call> = {
        status: 'atendida',
        details: callDetails,
        callDate: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        userId: selectedCall.userId || currentUser?.uid,
      };
      setDocumentNonBlocking(doc(callsCollectionRef, selectedCall.id), callData, { merge: true });
      toast({
        title: "Detalles guardados",
        description: "La información de la llamada ha sido registrada.",
      });
      setIsDetailsOpen(false);
      setSelectedCall(null);
    }
  };

  const confirmDelete = (call: Call) => {
    setCallToDelete(call);
  };

  const handleDelete = () => {
    if (callToDelete && callsCollectionRef) {
        setDocumentNonBlocking(doc(callsCollectionRef, callToDelete.id), { status_call: 'inactivo' }, { merge: true });
        setCallToDelete(null);
        toast({
            title: "Llamada archivada",
            description: "La llamada ha sido movida al archivo.",
        });
    }
  };

  const isLoading = callsLoading || votersLoading || usersLoading;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Llamadas</h1>
          <p className="text-muted-foreground">Coordina y registra las llamadas a los votantes.</p>
        </div>
         <div className="flex items-center gap-2">
            {isSyncing ? (
              <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sincronizando...
              </div>
            ) : (
              <>
                <Badge className={cn("gap-2", statusColors.pendiente)}>
                  <Clock className="h-3 w-3"/>
                  <span>Pendientes: {callStats.pending}</span>
                </Badge>
                <Badge className={cn("gap-2", statusColors.atendida)}>
                  <CheckCircle className="h-3 w-3"/>
                  <span>Atendidas: {callStats.attended}</span>
                </Badge>
              </>
            )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex-1">
            <CardTitle>Llamadas Programadas</CardTitle>
            <CardDescription>Listado de llamadas a realizar y su estado actual.</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {searchQuery && (
              <div className="text-sm text-muted-foreground">
                {processedCalls.length} resultado(s)
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="pl-10 h-9 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Votante</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Intentos</TableHead>
                <TableHead>Fecha de Atención</TableHead>
                <TableHead>Realizada por</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">Cargando...</TableCell>
                </TableRow>
              ) : !paginatedCalls || paginatedCalls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    {searchQuery ? "No se encontraron resultados." : "No hay llamadas pendientes. Agrega un votante para empezar."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCalls.map((call) => {
                  const voter = getVoterInfo(call.voterId);
                  const isLocked = !!call.details;
                  return (
                    <TableRow key={call.id} className={isLocked ? 'bg-muted/50' : ''}>
                      <TableCell className="font-medium">{voter ? `${voter.firstName} ${voter.lastName}` : 'Votante no encontrado'}</TableCell>
                      <TableCell>{voter?.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <Select
                            value={call.status}
                            onValueChange={(newStatus: Call['status']) => handleStatusChange(call, newStatus)}
                            disabled={isLocked}
                        >
                            <SelectTrigger className={cn(
                              "h-8 w-32 focus:ring-0 border-0 font-semibold",
                              statusColors[call.status]
                            )}>
                                <SelectValue placeholder="Selecciona estado" />
                            </SelectTrigger>
                            <SelectContent>
                                {CallStatus.map(status => (
                                <SelectItem key={status} value={status}>
                                    {statusLabels[status]}
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                         <Input
                          type="number"
                          value={localAttempts[call.id] ?? 0}
                          onChange={(e) => setLocalAttempts(prev => ({...prev, [call.id]: parseInt(e.target.value, 10) || 0}))}
                          onBlur={() => handleAttemptsBlur(call.id)}
                          className="h-8 w-20 p-1 text-center"
                          disabled={isLocked}
                         />
                      </TableCell>
                      <TableCell>{call.callDate ? format(new Date(call.callDate), 'dd/MM/yyyy HH:mm') : 'N/A'}</TableCell>
                      <TableCell>{getUserName(call.userId)}</TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="icon" onClick={() => handleView(call)}>
                           <Eye className="h-4 w-4" />
                         </Button>
                         <Button variant="ghost" size="icon" onClick={() => handleEdit(call)} disabled={isLocked}>
                           <Edit className="h-4 w-4" />
                         </Button>
                         <AlertDialog open={!!callToDelete && callToDelete.id === call.id} onOpenChange={(open) => !open && setCallToDelete(null)}>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => confirmDelete(call)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Esto marcará la llamada como inactiva y la archivará.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setCallToDelete(null)}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete}>Archivar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
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
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Llamada</DialogTitle>
          </DialogHeader>
          {selectedCall && (
            <CallForm
              call={selectedCall}
              users={users || []}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles de la Llamada</DialogTitle>
             <DialogDescription>
                Información detallada de la llamada y el votante.
            </DialogDescription>
          </DialogHeader>
           {selectedCall && (
             <div className="space-y-4 py-4">
                <div className="grid grid-cols-3 items-center gap-4">
                    <span className="font-semibold text-sm">Votante:</span>
                    <p className="col-span-2 text-sm text-muted-foreground">{getVoterInfo(selectedCall.voterId)?.firstName} {getVoterInfo(selectedCall.voterId)?.lastName}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-3 items-center gap-4">
                    <span className="font-semibold text-sm">Teléfono:</span>
                    <p className="col-span-2 text-sm text-muted-foreground">{getVoterInfo(selectedCall.voterId)?.phone || 'N/A'}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-3 items-center gap-4">
                    <span className="font-semibold text-sm">Estado:</span>
                    <Badge variant={selectedCall.status === "atendida" ? "default" : "secondary"} className="w-fit">
                        {statusLabels[selectedCall.status]}
                    </Badge>
                </div>
                <Separator />
                 <div className="grid grid-cols-3 items-center gap-4">
                    <span className="font-semibold text-sm">Intentos:</span>
                    <p className="col-span-2 text-sm text-muted-foreground">{selectedCall.attempts}</p>
                </div>
                 <Separator />
                <div className="grid grid-cols-3 items-center gap-4">
                    <span className="font-semibold text-sm">Fecha Atención:</span>
                    <p className="col-span-2 text-sm text-muted-foreground">{selectedCall.callDate ? format(new Date(selectedCall.callDate), 'PPP p', {}) : 'N/A'}</p>
                </div>
                 <Separator />
                <div className="grid grid-cols-3 items-center gap-4">
                    <span className="font-semibold text-sm">Realizada por:</span>
                    <p className="col-span-2 text-sm text-muted-foreground">{getUserName(selectedCall.userId)}</p>
                </div>
                <Separator />
                 <div className="space-y-2">
                    <span className="font-semibold text-sm">Detalles de la Llamada:</span>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedCall.details || 'No hay detalles registrados.'}</p>
                </div>
             </div>
           )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Detalles de Llamada Atendida</DialogTitle>
            <DialogDescription>
                Añade los detalles de la conversación con el votante. Una vez guardados, el registro se bloqueará.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="call-details">Detalles de la llamada</Label>
              <Textarea 
                id="call-details"
                placeholder="Escribe aquí las notas de la llamada..."
                value={callDetails}
                onChange={(e) => setCallDetails(e.target.value)}
                className="min-h-[150px]"
              />
            </div>
             <div className="space-y-2">
                <Label>Llamada realizada por</Label>
                 <Select
                    value={selectedCall?.userId || currentUser?.uid}
                    onValueChange={(userId) => {
                        setSelectedCall(prev => prev ? {...prev, userId} : null);
                    }}
                 >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona un usuario" />
                    </SelectTrigger>
                    <SelectContent>
                        {users?.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                                {user.firstName} {user.lastName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveDetails}>
              <Save className="mr-2 h-4 w-4" />
              Guardar y Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

    