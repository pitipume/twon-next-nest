'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { setLocale, type Locale } from '@/actions/locale.action';
import { cn } from '@/lib/utils';

export function LocaleToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div className={cn('flex items-center rounded-full border border-[var(--border)] bg-[var(--muted)] p-0.5 gap-0.5', className)}>
      {(['en', 'th'] as Locale[]).map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          disabled={isPending}
          className={cn(
            'h-7 px-2.5 rounded-full text-xs font-medium transition-colors',
            locale === l
              ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
          )}
        >
          {l === 'en' ? 'EN' : 'ไทย'}
        </button>
      ))}
    </div>
  );
}
