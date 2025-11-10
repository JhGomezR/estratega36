import { AppShell } from '@/components/layout/app-shell';
import { FirebaseClientProvider } from '@/firebase';
import { FacebookProvider } from '@/hooks/useFacebook';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseClientProvider>
        <FacebookProvider>
            <AppShell>{children}</AppShell>
        </FacebookProvider>
    </FirebaseClientProvider>
  );
}
