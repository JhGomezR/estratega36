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
      <head>
        {/* Tipografía del sistema de diseño (TailAdmin usa Outfit). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <FirebaseClientProvider>{children}</FirebaseClientProvider>
        </Providers>
      </body>
    </html>
  );
}
