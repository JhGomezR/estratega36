'use client';

import * as React from 'react';
import { Loader2, ShieldAlert, MapPin, DownloadCloud } from 'lucide-react';
import { useAuth } from '@/firebase';
import { usePlatformPermissions } from '@/hooks/usePlatformPermissions';
import { usePagedSearch } from '@/hooks/use-paged-search';
import { TableSearch, TablePagination } from '@/components/table-tools';
import type { LocationCity } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getLocations, seedColombia, setCountryActive, setCityActive } from './actions';

export default function LocationsPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const { hasPlatformPermission } = usePlatformPermissions();
  const canView = hasPlatformPermission('location:read');

  const [country, setCountry] = React.useState<{ name: string; active: boolean; cities: LocationCity[] } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const idToken = async () => {
    const t = await auth.currentUser?.getIdToken();
    if (!t) throw new Error('Sesión no disponible.');
    return t;
  };

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLocations({ idToken: await idToken() });
      setCountry(res.country || null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => { if (canView) load(); }, [canView, load]);

  const doSeed = async () => {
    setBusy(true);
    try {
      const res = await seedColombia({ idToken: await idToken() });
      if (res.success) { toast({ variant: 'success', title: 'Colombia cargada', description: `${res.count} municipios.` }); load(); }
      else toast({ variant: 'destructive', title: 'Error', description: res.error });
    } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); }
    finally { setBusy(false); }
  };

  const toggleCountry = async (active: boolean) => {
    if (!country) return;
    setBusy(true);
    // Optimista: país + cascada a municipios.
    setCountry({ ...country, active, cities: country.cities.map((c) => ({ ...c, active })) });
    try {
      const res = await setCountryActive({ idToken: await idToken(), active });
      if (!res.success) { toast({ variant: 'destructive', title: 'Error', description: res.error }); load(); }
    } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); load(); }
    finally { setBusy(false); }
  };

  const toggleCity = async (label: string, active: boolean) => {
    if (!country) return;
    setCountry({ ...country, cities: country.cities.map((c) => (c.label === label ? { ...c, active } : c)) });
    try {
      const res = await setCityActive({ idToken: await idToken(), label, active });
      if (!res.success) { toast({ variant: 'destructive', title: 'Error', description: res.error }); load(); }
    } catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }); load(); }
  };

  const paged = usePagedSearch(country?.cities || [], (c) => `${c.label} ${c.dept}`, 15);
  const activeCount = (country?.cities || []).filter((c) => c.active).length;

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
        <ShieldAlert className="h-10 w-10" />
        <p className="text-lg font-medium">No tienes acceso a ubicaciones</p>
        <p className="text-sm">Tu rol de plataforma no incluye <code>location:read</code>.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ubicación</h1>
        <p className="text-muted-foreground">Países y municipios disponibles para asignar a tenants y ver en el mapa.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div>
      ) : !country ? (
        <Card>
          <CardHeader>
            <CardTitle>Colombia</CardTitle>
            <CardDescription>Aún no se ha cargado el catálogo de municipios.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={doSeed} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DownloadCloud className="mr-2 h-4 w-4" />}
              Cargar municipios de Colombia
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>{country.name}</CardTitle>
                  <CardDescription>{activeCount} de {country.cities.length} municipios activos.</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={country.active ? 'secondary' : 'outline'}>{country.active ? 'Activo' : 'Inactivo'}</Badge>
                <Switch checked={country.active} onCheckedChange={toggleCountry} disabled={busy} />
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Al desactivar el país, todos sus municipios quedan inactivos (y al activarlo, todos activos). Solo los municipios activos aparecen en el selector de ciudad y en el mapa.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div><CardTitle>Municipios</CardTitle><CardDescription>Activa o desactiva municipios individuales.</CardDescription></div>
              <TableSearch value={paged.query} onChange={paged.setQuery} placeholder="Buscar municipio o departamento…" />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Municipio</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-right">Activo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.total === 0 && (
                    <TableRow><TableCell colSpan={3} className="py-10 text-center text-muted-foreground">Sin resultados.</TableCell></TableRow>
                  )}
                  {paged.pageItems.map((c) => (
                    <TableRow key={c.label}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.dept}</TableCell>
                      <TableCell className="text-right">
                        <Switch checked={c.active} onCheckedChange={(v) => toggleCity(c.label, v)} disabled={!country.active} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            {paged.total > 0 && (
              <CardFooter className="block"><TablePagination paged={paged} noun="municipios" /></CardFooter>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
