'use client';

import { useTranslations } from 'next-intl';
import { Features } from '@/config/features';

export function GoogleAuthButton({ namespace }: { namespace: 'auth.login' | 'auth.register' }) {
  const t = useTranslations(namespace);

  if (!Features.googleAuth) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-xs text-[var(--muted-foreground)]">{t('orContinueWith')}</span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <a
        href={`${process.env.NEXT_PUBLIC_API_URL}/auth/google`}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-transparent text-sm font-medium transition-all hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.07 7.94-2.92l-3.88-3c-1.08.72-2.46 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.27a12 12 0 0 0 0 10.75l4-3.11Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.94 1.19 15.23 0 12 0A12 12 0 0 0 1.27 6.63l4 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
          />
        </svg>
        {t('continueWithGoogle')}
      </a>
    </div>
  );
}
