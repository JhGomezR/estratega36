'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Building2, Users, ShieldCheck, BarChart3, Image as ImageIcon, Package, Bell, LogOut } from 'lucide-react';
import { useAuth, usePlatformClaims, useTenantResolution } from '@/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const NAV = [
  { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
  { href: '/admin/plans', label: 'Planes', icon: Package },
  { href: '/admin/notifications', label: 'Notificaciones', icon: Bell },
  { href: '/admin/users', label: 'Usuarios de plataforma', icon: Users },
  { href: '/admin/roles', label: 'Roles de plataforma', icon: ShieldCheck },
  { href: '/admin/branding', label: 'Marca del login', icon: ImageIcon },
  { href: '/admin/stats', label: 'Estadísticas', icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const claims = usePlatformClaims();
  const resolution = useTenantResolution();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
          {NAV.map(({ href, label, icon: Icon }) => (
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
