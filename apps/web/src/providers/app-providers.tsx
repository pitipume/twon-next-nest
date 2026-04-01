'use client';

import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

// Silently restore session from refresh token cookie on first load
function AuthBootstrap() {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    axios
      .post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .then(({ data }) => {
        if (data?.data?.accessToken) {
          useAuthStore.getState().setAccessToken(data.data.accessToken);
        }
        if (data?.data?.user) {
          useAuthStore.getState().setUser(data.data.user);
        }
      })
      .catch(() => {
        // no valid refresh token — guest mode, that's fine
      });
  }, []);
  return null;
}

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap />
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
