
'use client';

import React from 'react';
import { ThemeProvider } from 'next-themes';
import { FacebookProvider } from '@/hooks/useFacebook';
import { Toaster } from '../ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <FacebookProvider>
        {children}
        <Toaster />
      </FacebookProvider>
    </ThemeProvider>
  );
}
