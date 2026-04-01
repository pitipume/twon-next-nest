'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Product } from '@/types/product';
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

  if (!user || isLoading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">My Library</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Your purchased books and tarot decks</p>
      </div>

      {!items?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--muted-foreground)]">
          <span className="text-5xl">📚</span>
          <p className="mt-3 text-sm">Your library is empty</p>
          <Link href="/" className="mt-4 text-sm text-violet-600 hover:underline">
            Browse catalog →
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
                      {isEbook ? 'Ebook' : 'Tarot'}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="line-clamp-2 text-sm font-medium leading-snug">{p.title}</h3>
                  <p className="text-xs text-violet-600 font-medium">
                    {isEbook ? 'Read now →' : 'Shuffle deck →'}
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
