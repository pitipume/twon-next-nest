'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { useAuthStore } from '@/store/auth.store';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;

// No-ops entirely when no key is configured — local dev stays untracked by default.
if (typeof window !== 'undefined' && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: '2026-05-30', // pins SDK default behavior to a known snapshot — PostHog's own recommended pattern
    capture_pageview: false, // captured manually below — App Router navigation doesn't reload the page
  });
}

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    const url = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

function IdentifyUser() {
  const user = useAuthStore((s) => s.user);
  const identifiedId = useRef<string | null>(null);

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    if (user) {
      if (identifiedId.current !== user.id) {
        posthog.identify(user.id, { email: user.email, role: user.role });
        identifiedId.current = user.id;
      }
    } else if (identifiedId.current) {
      posthog.reset();
      identifiedId.current = null;
    }
  }, [user]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageviewTracker />
      <IdentifyUser />
      {children}
    </>
  );
}
