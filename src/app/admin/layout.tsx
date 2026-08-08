'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Building2, Users, ShieldCheck, BarChart3, Image as ImageIcon, Package, Bell, ScrollText, CircleDollarSign, Settings, LogOut } from 'lucide-react';
import { useAuth, useCollection, useDefaultDb, useMemoFirebase, usePlatformClaims, useTenantResolution } from '@/firebase';
import { usePlatformPermissions } from '@/hooks/usePlatformPermissions';
import { signOut } from 'firebase/auth';
import { collection } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { isOverdue } from '@/lib/billing';
import type { Tenant } from '@/lib/types';
import { Button } from '@/components/ui/button';

const NAV: { href: string; label: string; icon: typeof Building2; perm?: string }[] = [
  { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
  { href: '/admin/plans', label: 'Planes', icon: Package },
  { href: '/admin/billing', label: 'Facturación', icon: CircleDollarSign, perm: 'billing:read' },
  { href: '/admin/notifications', label: 'Notificaciones', icon: Bell },
  { href: '/admin/users', label: 'Usuarios de plataforma', icon: Users },
  { href: '/admin/roles', label: 'Roles de plataforma', icon: ShieldCheck },
  { href: '/admin/logs', label: 'Auditoría', icon: ScrollText, perm: 'audit:read' },
  { href: '/admin/branding', label: 'Marca del login', icon: ImageIcon },
  { href: '/admin/stats', label: 'Estadísticas', icon: BarChart3 },
  { href: '/admin/settings', label: 'Configuración', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const claims = usePlatformClaims();
  const resolution = useTenantResolution();
  const { hasPlatformPermission } = usePlatformPermissions();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const visibleNav = NAV.filter((item) => !item.perm || hasPlatformPermission(item.perm));

  // Aviso en el menú: nº de tenants vencidos (para "Facturación").
  const defaultDb = useDefaultDb();
  const tenantsRef = useMemoFirebase(
    () => (defaultDb && claims?.platformAdmin ? collection(defaultDb, 'tenants') : null),
    [defaultDb, claims?.platformAdmin]
  );
  const { data: allTenants } = useCollection<Tenant>(tenantsRef);
  const overdueCount = (allTenants || []).filter((t) => t.billing && isOverdue(t.billing.paidThrough)).length;

  // The AuthGate already redirects non-operators, but guard defensively here too.
  const resolving = resolution.state === 'idle' || resolution.state === 'resolving';

  React.useEffect(() => {
    if (!resolving && claims && !claims.platformAdmin) {
      router.replace('/');
    }
  }, [resolving, claims, router]);

  if (resolving || !claims?.platformAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r bg-muted/30 p-4">
        <div className="mb-6 px-2">
          <p className="text-lg font-bold">Control Plane</p>
          <p className="text-xs text-muted-foreground">Administración de plataforma</p>
        </div>
        <nav className="space-y-1">
          {visibleNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname.startsWith(href) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {href === '/admin/billing' && overdueCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">
                  {overdueCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-8">
          <Button variant="outline" className="w-full" onClick={() => signOut(auth).then(() => router.push('/login'))}>
            <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
