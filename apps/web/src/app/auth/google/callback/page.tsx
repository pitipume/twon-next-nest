'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const t = useTranslations('auth.googleCallback');

  useEffect(() => {
    const accessToken = params.get('accessToken');
    if (!accessToken) {
      toast.error(t('error'));
      router.replace('/auth/login?error=google_auth_failed');
      return;
    }

    setAccessToken(accessToken);

    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.data);
        router.replace('/');
      })
      .catch(() => {
        toast.error(t('error'));
        router.replace('/auth/login?error=google_auth_failed');
      });
    // Runs once on mount — accessToken is read directly from the initial URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <p className="text-sm text-[var(--muted-foreground)]">{t('signingIn')}</p>
    </div>
  );
}
