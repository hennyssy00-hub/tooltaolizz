'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PlatformProvider } from '@/context/PlatformContext';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <title>BetGuard - Hệ thống Soi Kèo & Bắt Gian Lận (Casino & Thể Thao)</title>
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <PlatformProvider>
            <MainLayout>
              {children}
            </MainLayout>
          </PlatformProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
