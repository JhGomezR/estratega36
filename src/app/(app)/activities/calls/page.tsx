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
import { Edit, Eye, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
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

const statusLabels: Record<Call['status'], string> = {
  pendiente: "Pendiente",
  atendida: "Atendida",
};

export default function CallsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
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
  const [selectedCall, setSelectedCall] = React.useState<Call | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [localAttempts, setLocalAttempts] = React.useState<Record<string, number>>({});

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

  const handleStatusChange = (callId: string, newStatus: Call['status']) => {
    if (firestore) {
      const originalCall = calls?.find(c => c.id === callId);
      if(originalCall && originalCall.status !== newStatus) {
        let callData: Partial<Call> = { status: newStatus };
        if (newStatus === 'atendida') {
          callData.callDate = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'");
        }
        setDocumentNonBlocking(doc(firestore, 'calls', callId), callData, { merge: true });
      }
    }
  };
  
  const getVoterInfo = (voterId: string) => {
    return voters?.find(v => v.id === voterId);
  }

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
              ) : !calls || calls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No hay llamadas pendientes. Agrega un votante para empezar.
                  </TableCell>
                </TableRow>
              ) : (
                calls.map((call) => {
                  const voter = getVoterInfo(call.voterId);
                  return (
                    <TableRow key={call.id}>
                      <TableCell className="font-medium">{voter ? `${voter.firstName} ${voter.lastName}` : 'Votante no encontrado'}</TableCell>
                      <TableCell>{voter?.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <Select
                            value={call.status}
                            onValueChange={(newStatus: Call['status']) => handleStatusChange(call.id, newStatus)}
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
                         />
                      </TableCell>
                      <TableCell>{call.callDate ? format(new Date(call.callDate), 'dd/MM/yyyy HH:mm') : 'N/A'}</TableCell>
                      <TableCell>{getUserName(call.userId)}</TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="icon" onClick={() => handleView(call)}>
                           <Eye className="h-4 w-4" />
                         </Button>
                         <Button variant="ghost" size="icon" onClick={() => handleEdit(call)}>
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
             </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

    