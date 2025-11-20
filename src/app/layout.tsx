import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/layout/providers';
import { FirebaseClientProvider } from '@/firebase';

export const metadata: Metadata = {
  title: 'EstrategaCRM',
  description: 'Gestión inteligente de campañas políticas.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>
          <FirebaseClientProvider>{children}</FirebaseClientProvider>
        </Providers>
      </body>
    </html>
  );
}
