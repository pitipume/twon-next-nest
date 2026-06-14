'use client';

import { useQuery } from '@tanstack/react-query';
import { BackButton } from '@/components/ui/back-button';
import { PageSpinner } from '@/components/ui/spinner';
import api from '@/lib/api';

interface MerchantEarning {
  merchantId: string;
  displayName: string;
  email: string;
  itemCount: number;
  grossTHB: number;
  commissionTHB: number;
  netTHB: number;
}

export default function MerchantEarningsPage() {
  const { data: earnings, isLoading } = useQuery({
    queryKey: ['merchant-earnings'],
    queryFn: async () => {
      const res = await api.get('/admin/merchant-earnings');
      return res.data.data as MerchantEarning[];
    },
  });

  if (isLoading) return <PageSpinner />;

  const totals = earnings?.reduce(
    (acc, m) => ({
      grossTHB: acc.grossTHB + m.grossTHB,
      commissionTHB: acc.commissionTHB + m.commissionTHB,
      netTHB: acc.netTHB + m.netTHB,
    }),
    { grossTHB: 0, commissionTHB: 0, netTHB: 0 },
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <BackButton fallback="/admin" />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Merchant earnings</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          All-time totals from completed orders. Pay merchants their net amount each month.
        </p>
      </div>

      {!earnings?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--muted-foreground)]">
          <span className="text-5xl">📊</span>
          <p className="mt-3 text-sm">No completed merchant sales yet</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total gross', value: totals!.grossTHB, color: 'text-[var(--foreground)]' },
              { label: 'Platform commission', value: totals!.commissionTHB, color: 'text-violet-600' },
              { label: 'Merchant net', value: totals!.netTHB, color: 'text-emerald-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-[var(--border)] p-4 space-y-1">
                <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
                <p className={`text-lg font-semibold ${color}`}>฿{value.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
              </div>
            ))}
          </div>

          {/* Per-merchant table */}
          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2 bg-[var(--muted)] text-xs font-medium text-[var(--muted-foreground)] border-b border-[var(--border)]">
              <span>Merchant</span>
              <span className="text-right">Items sold</span>
              <span className="text-right">Gross (฿)</span>
              <span className="text-right">Commission (฿)</span>
              <span className="text-right text-emerald-600">Net to pay (฿)</span>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {earnings.map((m) => (
                <div
                  key={m.merchantId}
                  className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] gap-1 sm:gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{m.displayName}</p>
                    <p className="text-xs text-[var(--muted-foreground)] truncate">{m.email}</p>
                  </div>
                  <div className="flex sm:block justify-between sm:text-right">
                    <span className="text-xs text-[var(--muted-foreground)] sm:hidden">Items</span>
                    <span className="text-sm">{m.itemCount}</span>
                  </div>
                  <div className="flex sm:block justify-between sm:text-right">
                    <span className="text-xs text-[var(--muted-foreground)] sm:hidden">Gross</span>
                    <span className="text-sm">฿{m.grossTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex sm:block justify-between sm:text-right">
                    <span className="text-xs text-[var(--muted-foreground)] sm:hidden">Commission</span>
                    <span className="text-sm text-violet-600">฿{m.commissionTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex sm:block justify-between sm:text-right">
                    <span className="text-xs text-[var(--muted-foreground)] sm:hidden">Net to pay</span>
                    <span className="text-sm font-semibold text-emerald-600">฿{m.netTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-[var(--muted-foreground)]">
            Transfer each merchant their net amount manually via bank transfer each month.
          </p>
        </>
      )}
    </div>
  );
}
