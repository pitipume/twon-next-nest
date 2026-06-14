'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Features } from '@/config/features';
import { ProductCard } from '@/components/catalog/product-card';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';
import { Product } from '@/types/product';

type Filter = 'all' | 'ebook' | 'tarot_deck';

interface LibraryItem {
  id: string;
  productId: string;
  product: Product;
  grantedAt: string;
}

function LibraryCard({ item, t }: { item: LibraryItem; t: ReturnType<typeof useTranslations> }) {
  const p = item.product;
  const isEbook = p.productType === 'EBOOK';
  const href = isEbook ? `/library/ebook/${item.productId}` : `/library/tarot/${item.productId}`;

  return (
    <Link
      href={href}
      className="group shrink-0 w-28 sm:w-32 flex flex-col snap-start"
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[var(--muted)]">
        {p.coverImageUrl ? (
          <Image
            src={p.coverImageUrl}
            alt={p.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="128px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl text-[var(--muted-foreground)]">
            {isEbook ? '📖' : '🃏'}
          </div>
        )}
        <div className="absolute top-1.5 left-1.5">
          <Badge variant={isEbook ? 'default' : 'warning'} className="text-[10px] px-1.5 py-0">
            {isEbook ? 'E' : 'T'}
          </Badge>
        </div>
      </div>
      <p className="mt-1.5 text-xs font-medium line-clamp-2 leading-tight">{p.title}</p>
      <p className="text-[11px] text-violet-600 mt-0.5">
        {isEbook ? t('readNow') : t('playNow')}
      </p>
    </Link>
  );
}

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const t = useTranslations('home');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: libraryItems } = useQuery({
    queryKey: ['library-home'],
    queryFn: async () => {
      const res = await api.get('/library');
      return res.data.data as LibraryItem[];
    },
    enabled: !!user,
  });

  const { data: catalogData, isLoading } = useQuery({
    queryKey: ['catalog', filter, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('type', filter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await api.get(`/catalog?${params}`);
      // res.data.data = { items: ProductListItem[], total: number }
      return res.data.data.items as Product[];
    },
  });

  const filteredLibrary = libraryItems?.filter(
    (item) => !search || item.product.title.toLowerCase().includes(search.toLowerCase()),
  );

  // O(1) ownership lookup for the catalog grid
  const ownedProductIds = new Set(libraryItems?.map((item) => item.productId) ?? []);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'ebook', label: t('filterEbook') },
    ...(Features.etarot ? [{ key: 'tarot_deck' as Filter, label: t('filterTarot') }] : []),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      {/* Search bar */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={Features.etarot ? t('searchPlaceholder') : t('searchPlaceholderEbook')}
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {/* Library row — logged-in users only */}
      {user && !!filteredLibrary?.length && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('yourLibrary')}</h2>
            <Link href="/library" className="text-sm text-violet-600 hover:underline">
              {t('seeAll')}
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
            {filteredLibrary.slice(0, 10).map((item) => (
              <LibraryCard key={item.id} item={item} t={t} />
            ))}
          </div>
        </section>
      )}

      {/* Browse / Market */}
      <section className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-semibold">{t('browse')}</h2>
          <div className="flex gap-1.5">
            {filters.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter === key
                    ? 'bg-violet-600 text-white'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <PageSpinner />
        ) : !catalogData?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--muted-foreground)]">
            <span className="text-5xl">📭</span>
            <p className="mt-3 text-sm">
              {debouncedSearch ? t('noResults', { q: debouncedSearch }) : t('empty')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {catalogData.map((p) => (
              <ProductCard key={p.id} product={p} isOwned={ownedProductIds.has(p.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
