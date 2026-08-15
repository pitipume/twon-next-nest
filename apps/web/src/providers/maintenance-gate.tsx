'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import enMessages from '../../messages/en.json';
import thMessages from '../../messages/th.json';

interface MaintenanceStatus {
  enabled: boolean;
  backByAt: string | null;
}

// The whole auth surface must stay reachable during maintenance — otherwise
// an ADMIN who isn't already logged in (fresh browser, cleared cookies, a
// different device) has no way to ever authenticate and turn it back off.
const EXEMPT_PREFIX = '/auth/';

// Shown in both languages at once (not just the current locale) — a closed
// site has no navbar/language switcher, so a visitor has no way to change
// locale to understand why they can't get in.
const en = enMessages.maintenance;
const th = thMessages.maintenance;

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();

  // Polled (not just on mount) so an already-open tab picks up ADMIN
  // toggling maintenance on without needing a reload.
  const { data, isLoading } = useQuery({
    queryKey: ['maintenance-status'],
    queryFn: async () => {
      const res = await api.get('/system/maintenance-status');
      return res.data.data as MaintenanceStatus;
    },
    refetchInterval: 60_000,
  });

  // Optimistic default: render normally while the first check is in flight —
  // avoids gating every single page load behind a network round trip for
  // the near-100% of the time maintenance is off.
  if (isLoading || !data?.enabled || user?.role === 'ADMIN' || pathname?.startsWith(EXEMPT_PREFIX)) {
    return <>{children}</>;
  }

  const backByTime = data.backByAt ? new Date(data.backByAt).toLocaleString() : null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md space-y-8">
        <div className="text-6xl" aria-hidden="true">🚧</div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{en.title}</h1>
          <p className="text-[var(--muted-foreground)]">{en.message}</p>
          {backByTime && (
            <p className="text-sm text-[var(--muted-foreground)]">
              {en.backBy.replace('{time}', backByTime)}
            </p>
          )}
        </div>

        <div className="h-px w-16 mx-auto bg-[var(--border)]" />

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{th.title}</h1>
          <p className="text-[var(--muted-foreground)]">{th.message}</p>
          {backByTime && (
            <p className="text-sm text-[var(--muted-foreground)]">
              {th.backBy.replace('{time}', backByTime)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
