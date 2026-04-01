'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ProductCard } from '@/components/catalog/product-card';
import { PageSpinner } from '@/components/ui/spinner';
import { Product } from '@/types/product';

type Filter = 'all' | 'ebook' | 'tarot_deck';

export default function HomePage() {
  const [filter, setFilter] = useState<Filter>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['catalog', filter],
    queryFn: async () => {
      const params = filter !== 'all' ? `?type=${filter}` : '';
      const res = await api.get(`/catalog/products${params}`);
      return res.data.data as Product[];
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      {/* Hero */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          ✦ Discover books &amp; tarot
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Read ebooks in your browser. Shuffle tarot decks in your hands.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        {(['all', 'ebook', 'tarot_deck'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filter === f
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {f === 'all' ? 'All' : f === 'ebook' ? 'Ebooks' : 'Tarot Decks'}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <PageSpinner />
      ) : !data?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--muted-foreground)]">
          <span className="text-5xl">📭</span>
          <p className="mt-3 text-sm">No products yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {data.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
