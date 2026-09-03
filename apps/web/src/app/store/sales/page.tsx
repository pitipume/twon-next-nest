'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { BackButton } from '@/components/ui/back-button';
import { PageSpinner } from '@/components/ui/spinner';
import api from '@/lib/api';

interface SaleItem {
  orderId: string;
  orderItemId: string;
  purchasedAt: string;
  buyerName: string;
  buyerEmail: string;
  productTitle: string;
  productType: string;
  priceTHB: number;
  netAmount: number;
}

export default function StoreSalesHistoryPage() {
  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales-history'],
    queryFn: async () => {
      const res = await api.get('/admin/sales-history');
      return res.data.data as SaleItem[];
    },
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <BackButton fallback="/store" />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Sales history</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Every completed sale of your products, most recent first</p>
      </div>

      {!sales?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--muted-foreground)]">
          <span className="text-5xl">🧾</span>
          <p className="mt-3 text-sm">No sales yet</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-2 bg-[var(--muted)] text-xs font-medium text-[var(--muted-foreground)] border-b border-[var(--border)]">
            <span>Product</span>
            <span>Buyer</span>
            <span className="text-right">Price (฿)</span>
            <span className="text-right">Date</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {sales.map((s) => (
              <Link
                key={s.orderItemId}
                href={`/store/sales/${s.orderId}`}
                className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_auto_auto] gap-1 sm:gap-4 px-4 py-3 transition-colors hover:bg-[var(--muted)]"
              >
                <p className="truncate text-sm font-medium">{s.productTitle}</p>
                <div className="min-w-0">
                  <p className="truncate text-sm">{s.buyerName}</p>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">{s.buyerEmail}</p>
                </div>
                <span className="flex justify-between text-sm sm:block sm:text-right">
                  <span className="text-xs text-[var(--muted-foreground)] sm:hidden">Price</span>
                  ฿{s.priceTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
                <span className="flex justify-between text-xs text-[var(--muted-foreground)] sm:block sm:text-right">
                  <span className="sm:hidden">Date</span>
                  {new Date(s.purchasedAt).toLocaleDateString('th-TH')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
