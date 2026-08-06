
"use client"
import * as React from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
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
import { PlusCircle, Edit, Trash2, Eye, LayoutGrid, List, ChevronLeft, ChevronRight } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import type { Campaign, ManagedList } from "@/lib/types"
import { CampaignForm } from "@/components/campaign-form"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAuth, useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { getImpersonatedTenantId } from "@/firebase/tenant-db"
import { createCampaign } from "./actions"
import { usePermissions } from "@/hooks/usePermissions"
import { collection, doc } from "firebase/firestore"
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
import { isToday, isPast, parseISO, differenceInMilliseconds } from "date-fns"
import { cn } from "@/lib/utils"
import { CampaignGrid } from "@/components/campaign-grid"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import { logAuditEvent } from "@/lib/audit-log-client"
import { useToast } from "@/hooks/use-toast"

const statusColors: Record<string, string> = {
  'En Campaña': 'bg-blue-500 hover:bg-blue-600 text-white',
  'Finalizada': 'bg-green-500 hover:bg-green-600 text-white',
  'Futura': 'bg-yellow-500 hover:bg-yellow-600 text-yellow-900',
  'Archivada': 'bg-gray-500 hover:bg-gray-600 text-white',
};

const CAMPAIGNS_PER_PAGE = 15;


export default function CampaignsPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user: userProfile, isAdmin } = usePermissions();
  const { user: currentUser } = useUser();
  const { toast } = useToast();

  const campaignsCollection = useMemoFirebase(() => firestore ? collection(firestore, `campaigns`) : null, [firestore]);
  const { data: campaignsData, isLoading: campaignsLoading } = useCollection<Campaign>(campaignsCollection);

  const listsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, `lists`) : null, [firestore]);
  const { data: managedLists, isLoading: listsLoading } = useCollection<ManagedList>(listsCollectionRef);
  
  const [selectedCampaign, setSelectedCampaign] = React.useState<Campaign | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [campaignToDelete, setCampaignToDelete] = React.useState<Campaign | null>(null);
  const [view, setView] = React.useState<'list' | 'grid'>('grid');
  const [searchQuery, setSearchQuery] = React.useState("");
  const [campaignFilter, setCampaignFilter] = React.useState<string>('all');
  const [currentPage, setCurrentPage] = React.useState(1);

  // El admin ve TODAS las campañas (todos los estados, incl. archivadas). Un
  // usuario normal solo ve las campañas que tiene asignadas (user.campaignIds).
  const campaigns = React.useMemo(() => {
    const all = campaignsData ?? [];
    if (isAdmin) return all;
    const mine = new Set(userProfile?.campaignIds || []);
    return all.filter(c => mine.has(c.id));
  }, [campaignsData, isAdmin, userProfile]);
  
  React.useEffect(() => {
    if (campaigns && campaignsCollection && currentUser) {
      campaigns.forEach(campaign => {
        if (campaign.status !== 'Finalizada' && campaign.status !== 'Archivada') {
          try {
            const endDate = parseISO(campaign.endDate);
            if (isPast(endDate) && !isToday(endDate)) {
              setDocumentNonBlocking(doc(campaignsCollection, campaign.id), { status: 'Finalizada', progress: 100 }, { merge: true });
              logAuditEvent(currentUser, 'campaign:auto_finalize', { campaignId: campaign.id, name: campaign.name });
            }
          } catch (e) {
            console.error(`Invalid date for campaign ${campaign.id}: ${campaign.endDate}`);
          }
        }
      });
    }
  }, [campaigns, campaignsCollection, currentUser]);

  const processedCampaigns = React.useMemo(() => {
    if (!campaigns) return [];
    
    const now = new Date();
    
    const filtered = campaigns.filter(campaign => {
        if (campaignFilter !== 'all' && campaign.id !== campaignFilter) return false;
        if (!searchQuery) return true;
        const lowerCaseQuery = searchQuery.toLowerCase();
        return campaign.name.toLowerCase().includes(lowerCaseQuery) ||
               campaign.campaignType.toLowerCase().includes(lowerCaseQuery) ||
               campaign.status.toLowerCase().includes(lowerCaseQuery);
    });

    return filtered.map(campaign => {
        let calculatedProgress = campaign.progress;
        
        try {
            const startDate = parseISO(campaign.startDate);
            const endDate = parseISO(campaign.endDate);

            if (campaign.status === 'Futura' || now < startDate) {
                calculatedProgress = 0;
            } else if (campaign.status === 'Finalizada' || campaign.status === 'Archivada' || now > endDate) {
                calculatedProgress = 100;
            } else if (campaign.status === 'En Campaña') {
                const totalDuration = differenceInMilliseconds(endDate, startDate);
                const elapsedDuration = differenceInMilliseconds(now, startDate);
                
                if (totalDuration > 0) {
                    const progress = (elapsedDuration / totalDuration) * 100;
                    calculatedProgress = Math.round(Math.min(100, Math.max(0, progress)));
                } else {
                    calculatedProgress = 0;
                }
            }
        } catch (e) {
            console.error(`Could not calculate progress for campaign ${campaign.id}`, e);
        }
        
        return { ...campaign, progress: calculatedProgress };
    });
  }, [campaigns, searchQuery, campaignFilter]);

  const paginatedCampaigns = React.useMemo(() => {
    const startIndex = (currentPage - 1) * CAMPAIGNS_PER_PAGE;
    return processedCampaigns.slice(startIndex, startIndex + CAMPAIGNS_PER_PAGE);
  }, [processedCampaigns, currentPage]);

  const totalPages = Math.ceil(processedCampaigns.length / CAMPAIGNS_PER_PAGE);


  const lists = React.useMemo(() => {
    const listsMap: Record<string, ManagedList | undefined> = {};
    if (managedLists) {
        managedLists.forEach(list => {
            listsMap[list.id] = list;
        });
    }
    return listsMap;
  }, [managedLists]);

  const handleAddNew = () => {
    setSelectedCampaign(null);
    setIsFormOpen(true);
  }

  const handleEdit = (campaign: Campaign) => {
    // Las campañas archivadas están bloqueadas (solo el admin puede editarlas).
    if (campaign.status === 'Archivada' && !isAdmin) {
      toast({ variant: 'destructive', title: 'Campaña archivada', description: 'Esta campaña está bloqueada y no se puede editar.' });
      return;
    }
    setSelectedCampaign(campaign);
    setIsFormOpen(true);
  }
  
  const confirmDelete = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
  }

  const handleDelete = () => {
    if (campaignsCollection && campaignToDelete && currentUser) {
      setDocumentNonBlocking(doc(campaignsCollection, campaignToDelete.id), { status: 'Archivada' }, { merge: true });
      logAuditEvent(currentUser, 'campaign:archive', { campaignId: campaignToDelete.id, name: campaignToDelete.name });
      setCampaignToDelete(null);
      toast({ title: "Campaña Archivada", description: `La campaña "${campaignToDelete.name}" ha sido archivada.` });
    }
  }

  const handleFormSubmit = async (data: Omit<Campaign, 'id' | 'progress'>) => {
    if (!campaignsCollection || !currentUser) return;

    if (selectedCampaign) {
      const campaignData: Partial<Campaign> = { ...data };
      if (campaignData.status === 'Finalizada') campaignData.progress = 100;
      setDocumentNonBlocking(doc(campaignsCollection, selectedCampaign.id), campaignData, { merge: true });
      logAuditEvent(currentUser, 'campaign:update', { campaignId: selectedCampaign.id, name: data.name });
      toast({ title: "Campaña Actualizada", description: "Los cambios han sido guardados." });
    } else {
      // Crear va por Server Action para hacer cumplir el límite de campañas del plan.
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        toast({ variant: 'destructive', title: 'Error', description: 'Sesión no disponible. Vuelve a iniciar sesión.' });
        return;
      }
      const res = await createCampaign(data, idToken, getImpersonatedTenantId());
      if (res.error) {
        // Mantén el diálogo abierto para que el usuario ajuste.
        toast({ variant: 'destructive', title: 'No se pudo crear la campaña', description: res.error });
        return;
      }
      logAuditEvent(currentUser, 'campaign:create', { campaignId: res.id, name: data.name });
      toast({ title: "Campaña Creada", description: "La nueva campaña ha sido creada exitosamente." });
    }
    setIsFormOpen(false);
  }

  const getStatusLabel = (statusValue: string) => {
      const statusList = lists.campaignStatuses?.items || [];
      return statusList.find(s => s.toLowerCase().replace(/\s/g, '_') === statusValue) || statusValue;
  }

  const isLoading = campaignsLoading || listsLoading;
  
  // Filtro de campaña: aparece cuando hay más de una visible (el admin siempre
  // tiene varias; un usuario con >1 asignada también). Con una sola, no se muestra.
  const campaignFilterSelect = campaigns.length > 1 ? (
    <Select value={campaignFilter} onValueChange={(v) => { setCampaignFilter(v); setCurrentPage(1); }}>
      <SelectTrigger className="h-9 w-full sm:w-56"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas las campañas</SelectItem>
        {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
      </SelectContent>
    </Select>
  ) : null;

  const searchAndFilter = (
    <div className="flex flex-col gap-2 sm:flex-row">
      {campaignFilterSelect}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar campaña..."
          className="pl-10 h-9"
          value={searchQuery}
          onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Campañas</h1>
          <p className="text-muted-foreground">Administra y monitorea tus campañas políticas.</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-md bg-muted p-1">
                <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('grid')} className="gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Grid
                </Button>
                <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('list')} className="gap-2">
                    <List className="h-4 w-4" />
                    Lista
                </Button>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Campaña
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                <DialogTitle>{selectedCampaign ? "Editar Campaña" : "Nueva Campaña"}</DialogTitle>
                </DialogHeader>
                <CampaignForm
                campaign={selectedCampaign}
                lists={lists}
                onSubmit={handleFormSubmit as any}
                onCancel={() => setIsFormOpen(false)}
                />
            </DialogContent>
            </Dialog>
        </div>
      </div>
        {view === 'list' ? (
        <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Lista de Campañas</CardTitle>
                <CardDescription>
                    Un listado de todas las campañas en tu sistema.
                </CardDescription>
              </div>
              {searchAndFilter}
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Fecha de Fin</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading && (
                    <TableRow>
                    <TableCell colSpan={6} className="text-center">Cargando...</TableCell>
                    </TableRow>
                )}
                {!isLoading && paginatedCampaigns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                        {searchQuery ? "No se encontraron campañas." : "No hay campañas para mostrar."}
                    </TableCell>
                  </TableRow>
                )}
                {paginatedCampaigns?.map((campaign) => {
                    const endDate = parseISO(campaign.endDate);
                    const isEndingToday = isToday(endDate);
                    const statusLabel = campaign.status;
                    return (
                    <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell className="capitalize">{campaign.campaignType}</TableCell>
                    <TableCell>
                        <Badge
                        className={cn(
                            "capitalize",
                            isEndingToday && campaign.status !== 'Finalizada' 
                            ? "bg-red-500 text-white" 
                            : statusColors[statusLabel] || "bg-gray-400"
                        )}
                        >
                        {statusLabel}
                        </Badge>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <Progress value={campaign.progress} className="w-24" />
                            <span>{campaign.progress}%</span>
                        </div>
                    </TableCell>
                    <TableCell className={cn(isEndingToday && campaign.status !== 'Finalizada' && "text-red-500 font-bold")}>{campaign.endDate}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                        <Link href={`/campaigns/${campaign.id}`}>
                            <Eye className="h-4 w-4" />
                        </Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(campaign)} disabled={campaign.status === 'Archivada' && !isAdmin} title={campaign.status === 'Archivada' ? 'Archivada (bloqueada)' : undefined}>
                        <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog open={!!campaignToDelete && campaignToDelete.id === campaign.id} onOpenChange={(open) => !open && setCampaignToDelete(null)}>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => confirmDelete(campaign)} disabled={campaign.status === 'Archivada'} title={campaign.status === 'Archivada' ? 'Ya está archivada' : undefined}>
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Esto marcará la campaña como archivada.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setCampaignToDelete(null)}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>Archivar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                    </TableRow>
                    )
                })}
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
        ) : (
            <div className="space-y-6">
                {searchAndFilter}
                <CampaignGrid campaigns={processedCampaigns} isLoading={isLoading} statusColors={statusColors}/>
            </div>
        )}
    </div>
  )
}
