
'use client';

import React from 'react';
import { ThemeProvider } from 'next-themes';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { FacebookProvider } from '@/hooks/useFacebook';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <FirebaseClientProvider>
        <FacebookProvider>{children}</FacebookProvider>
      </FirebaseClientProvider>
    </ThemeProvider>
  );
}
