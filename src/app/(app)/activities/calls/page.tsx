"use client"
import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
import { Edit, Eye, Loader2, Save, Search, Clock, CheckCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
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

export default function CallsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  const { data: calls, isLoading: callsLoading } = useCollection<Call>(
    useMemoFirebase(() => firestore ? collection(firestore, "calls") : null, [firestore])
  );
  const { data: voters, isLoading: votersLoading } = useCollection<Voter>(
    useMemoFirebase(() => firestore ? collection(firestore, "voters") : null, [firestore])
  );
  const { data: users, isLoading: usersLoading } = useCollection<User>(
    useMemoFirebase(() => firestore ? collection(firestore, "users") : null, [firestore])
  );

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isViewOpen, setIsViewOpen] = React.useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [selectedCall, setSelectedCall] = React.useState<Call | null>(null);
  const [callDetails, setCallDetails] = React.useState("");
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [localAttempts, setLocalAttempts] = React.useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = React.useState("");

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
      if (!firestore || !voters || !calls) return;

      setIsSyncing(true);
      try {
        const existingCallVoterIds = new Set(calls.map(c => c.voterId));
        const votersToCall = voters.filter(v => !existingCallVoterIds.has(v.id));

        if (votersToCall.length > 0) {
          const batch = writeBatch(firestore);
          votersToCall.forEach(voter => {
            const newCallRef = doc(collection(firestore, "calls"));
            batch.set(newCallRef, {
              voterId: voter.id,
              status: "pendiente",
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
  }, [voters, calls, firestore, toast]);

  const getVoterInfo = React.useCallback((voterId: string) => {
    return voters?.find(v => v.id === voterId);
  }, [voters]);

  const processedCalls = React.useMemo(() => {
    if (!calls) return [];

    const filtered = calls.filter(call => {
      if (!searchQuery) return true;
      const voter = getVoterInfo(call.voterId);
      const lowercasedQuery = searchQuery.toLowerCase();
      return voter ? `${voter.firstName} ${voter.lastName}`.toLowerCase().includes(lowercasedQuery) : false;
    });

    return filtered.sort((a, b) => {
      if (a.status === 'pendiente' && b.status !== 'pendiente') return -1;
      if (a.status !== 'pendiente' && b.status === 'pendiente') return 1;
      if (a.callDate && b.callDate) return new Date(b.callDate).getTime() - new Date(a.callDate).getTime();
      if (a.callDate) return -1;
      if (b.callDate) return 1;
      return 0;
    });
  }, [calls, searchQuery, getVoterInfo]);

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

  const handleFormSubmit = (data: Omit<Call, 'id' | 'voterId' | 'callDate'>) => {
    if (firestore && selectedCall) {
      let callData: Partial<Call> = { ...data };
      if (data.status === 'atendida' && selectedCall.status !== 'atendida') {
        callData.callDate = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'");
      }
      setDocumentNonBlocking(doc(firestore, 'calls', selectedCall.id), callData, { merge: true });
    }
    setIsFormOpen(false);
  };

  const handleAttemptsChange = (callId: string, value: string) => {
    const newAttempts = parseInt(value, 10);
    if (!isNaN(newAttempts)) {
        setLocalAttempts(prev => ({ ...prev, [callId]: newAttempts }));
    }
  }

  const handleAttemptsBlur = (callId: string) => {
    if (firestore && localAttempts[callId] !== undefined) {
      const originalCall = calls?.find(c => c.id === callId);
      if (originalCall && originalCall.attempts !== localAttempts[callId]) {
        setDocumentNonBlocking(doc(firestore, 'calls', callId), { attempts: localAttempts[callId] }, { merge: true });
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
    } else if (firestore) {
      setDocumentNonBlocking(doc(firestore, 'calls', call.id), { status: newStatus }, { merge: true });
    }
  };

  const handleSaveDetails = () => {
    if (firestore && selectedCall) {
      const callData: Partial<Call> = {
        status: 'atendida',
        details: callDetails,
        callDate: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        userId: selectedCall.userId || currentUser?.uid,
      };
      setDocumentNonBlocking(doc(firestore, 'calls', selectedCall.id), callData, { merge: true });
      toast({
        title: "Detalles guardados",
        description: "La información de la llamada ha sido registrada.",
      });
      setIsDetailsOpen(false);
      setSelectedCall(null);
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId) return 'N/A';
    const user = users?.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Desconocido';
  }

  const isLoading = callsLoading || votersLoading || usersLoading;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Llamadas</h1>
          <p className="text-muted-foreground">Coordina y registra las llamadas a los votantes.</p>
        </div>
         {isSyncing && (
            <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sincronizando...
            </div>
        )}
      </div>

       <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Llamadas Pendientes
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callStats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Llamadas por realizar.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Llamadas Atendidas
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callStats.attended}</div>
            <p className="text-xs text-muted-foreground">
              Llamadas que ya fueron contactadas.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre de votante..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Llamadas Programadas</CardTitle>
          <CardDescription>Listado de llamadas a realizar y su estado actual.</CardDescription>
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
              ) : !processedCalls || processedCalls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    {searchQuery ? "No se encontraron resultados." : "No hay llamadas pendientes. Agrega un votante para empezar."}
                  </TableCell>
                </TableRow>
              ) : (
                processedCalls.map((call) => {
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
                              call.status === 'pendiente' && 'bg-yellow-500/20 text-yellow-700',
                              call.status === 'atendida' && 'bg-green-500/20 text-green-700'
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
                          onChange={(e) => handleAttemptsChange(call.id, e.target.value)}
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
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
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
