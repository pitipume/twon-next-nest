'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Product } from '@/types/product';
import { Order } from '@/types/order';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';

interface LibraryItem {
  id: string;
  productId: string;
  product: Product;
  grantedAt: string;
}

export default function LibraryPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const t = useTranslations('library');
  const tp = useTranslations('product');

  useEffect(() => {
    if (user === null) router.push('/auth/login');
  }, [user, router]);

  const { data: items, isLoading } = useQuery({
    queryKey: ['library'],
    queryFn: async () => {
      const res = await api.get('/library');
      return res.data.data as LibraryItem[];
    },
    enabled: !!user,
  });

  const { data: orders } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const res = await api.get('/store/orders');
      return res.data.data as Order[];
    },
    enabled: !!user,
  });

  const pendingOrders = orders?.filter((o) => o.status === 'PENDING' || o.status === 'WAITING_APPROVAL') ?? [];

  if (!user || isLoading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t('subtitle')}</p>
      </div>

      {pendingOrders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[var(--muted-foreground)]">{t('pendingTitle')}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pendingOrders.map((order) => (
              <Link
                key={order.id}
                href={`/checkout/${order.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-amber-300/50 bg-amber-50 p-4 transition-colors hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {order.orderItems.map((i) => i.product?.title).filter(Boolean).join(', ')}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t('pendingOrderedOn', { date: new Date(order.createdAt).toLocaleDateString() })}
                  </p>
                  <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                    {order.status === 'WAITING_APPROVAL' ? t('pendingWaitingApproval') : t('pendingUploadSlip')}
                  </p>
                </div>
                <span className="text-2xl shrink-0">⏳</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!items?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--muted-foreground)]">
          <span className="text-5xl">📚</span>
          <p className="mt-3 text-sm">{t('emptyTitle')}</p>
          <Link href="/" className="mt-4 text-sm text-violet-600 hover:underline">
            {t('browseCatalog')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => {
            const p = item.product;
            const isEbook = p.productType === 'EBOOK';
            const href = isEbook
              ? `/library/ebook/${item.productId}`
              : `/library/tarot/${item.productId}`;
            return (
              <Link
                key={item.id}
                href={href}
                className="group flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="relative aspect-[2/3] overflow-hidden bg-[var(--muted)]">
                  {p.coverImageUrl ? (
                    <Image
                      src={p.coverImageUrl}
                      alt={p.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, 20vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl text-[var(--muted-foreground)]">
                      {isEbook ? '📖' : '🃏'}
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge variant={isEbook ? 'default' : 'warning'}>
                      {isEbook ? tp('ebook') : tp('tarot')}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="line-clamp-2 text-sm font-medium leading-snug">{p.title}</h3>
                  <p className="text-xs text-violet-600 font-medium">
                    {isEbook ? t('readNow') : t('shuffleDeck')}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
