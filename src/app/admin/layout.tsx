'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Building2, Users, ShieldCheck, BarChart3, Image as ImageIcon, Package, Bell, ScrollText, CircleDollarSign, Settings, MapPin, LogOut } from 'lucide-react';
import { useAuth, useCollection, useDefaultDb, useDoc, useMemoFirebase, usePlatformClaims, useTenantResolution } from '@/firebase';
import { usePlatformPermissions } from '@/hooks/usePlatformPermissions';
import { signOut } from 'firebase/auth';
import { collection, doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { isOverdue } from '@/lib/billing';
import type { Tenant, BrandingSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';

type NavItem = { href: string; label: string; icon: typeof Building2; perm?: string };

// Secciones del menú, cada una ordenada alfabéticamente por etiqueta.
const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Plataforma',
    items: [
      { href: '/admin/stats', label: 'Estadísticas', icon: BarChart3, perm: 'stats:read' },
      { href: '/admin/billing', label: 'Facturación', icon: CircleDollarSign, perm: 'billing:read' },
      { href: '/admin/notifications', label: 'Notificaciones', icon: Bell, perm: 'notification:read' },
      { href: '/admin/plans', label: 'Planes', icon: Package, perm: 'plan:read' },
      { href: '/admin/tenants', label: 'Tenants', icon: Building2, perm: 'tenant:read' },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { href: '/admin/logs', label: 'Auditoría', icon: ScrollText, perm: 'audit:read' },
      { href: '/admin/branding', label: 'Branding', icon: ImageIcon, perm: 'branding:update' },
      { href: '/admin/settings', label: 'Configuración', icon: Settings, perm: 'setting:update' },
      { href: '/admin/roles', label: 'Roles de plataforma', icon: ShieldCheck, perm: 'platformRole:read' },
      { href: '/admin/locations', label: 'Ubicación', icon: MapPin, perm: 'location:read' },
      { href: '/admin/users', label: 'Usuarios de plataforma', icon: Users, perm: 'platformUser:read' },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const claims = usePlatformClaims();
  const resolution = useTenantResolution();
  const { hasPlatformPermission } = usePlatformPermissions();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Aviso en el menú: nº de tenants vencidos (para "Facturación").
  const defaultDb = useDefaultDb();
  const tenantsRef = useMemoFirebase(
    () => (defaultDb && claims?.platformAdmin ? collection(defaultDb, 'tenants') : null),
    [defaultDb, claims?.platformAdmin]
  );
  const { data: allTenants } = useCollection<Tenant>(tenantsRef);
  const overdueCount = (allTenants || []).filter((t) => t.billing && isOverdue(t.billing.paidThrough)).length;

  // Logo de marca para la barra lateral del Control Plane (fallback: texto).
  const brandingRef = useMemoFirebase(() => (defaultDb ? doc(defaultDb, 'settings/branding') : null), [defaultDb]);
  const { data: branding } = useDoc<BrandingSettings>(brandingRef);

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

  const menuItem = 'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-theme-sm font-medium transition-colors duration-200';
  const inactive = 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground';
  const active = 'bg-sidebar-accent text-sidebar-accent-foreground';

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="sticky top-0 flex h-screen w-[290px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4">
        {/* Cabecera / marca */}
        <div className="flex h-16 shrink-0 items-center lg:h-[72px]">
          {branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt="Logo" className="h-9 w-auto object-contain" />
          ) : (
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span className="text-theme-xl font-semibold tracking-tight text-foreground">Control Plane</span>
            </div>
          )}
        </div>

        {/* Navegación */}
        <nav className="custom-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto pb-4 pt-2">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter((item) => !item.perm || hasPlatformPermission(item.perm));
            if (items.length === 0) return null;
            return (
              <div key={section.title} className="flex flex-col gap-1">
                <h3 className="mb-1 px-3 text-theme-xs font-semibold uppercase leading-5 tracking-wider text-sidebar-muted">
                  {section.title}
                </h3>
                {items.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(menuItem, isActive ? active : inactive)}
                    >
                      <Icon className={cn('h-5 w-5 shrink-0 transition-colors', isActive ? 'text-sidebar-accent-foreground' : 'text-sidebar-muted')} />
                      <span className="truncate">{label}</span>
                      {href === '/admin/billing' && overdueCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">
                          {overdueCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Cerrar sesión */}
        <div className="shrink-0 pb-6 pt-2">
          <Button variant="outline" className="w-full" onClick={() => signOut(auth).then(() => router.push('/login'))}>
            <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-6 md:p-8">
        <div className="mx-auto w-full max-w-[1536px]">{children}</div>
      </main>
    </div>
  );
}
