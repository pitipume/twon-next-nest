'use client';

import { useState } from 'react';
import { BackButton } from '@/components/ui/back-button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PendingOrder } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageSpinner } from '@/components/ui/spinner';

export default function PendingOrdersPage() {
  const qc = useQueryClient();
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: orders, isLoading } = useQuery({
    queryKey: ['pending-orders'],
    queryFn: async () => {
      const res = await api.get('/payment/orders/pending');
      return res.data.data as PendingOrder[];
    },
    refetchInterval: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: (orderId: string) => api.post(`/payment/orders/${orderId}/approve`),
    onSuccess: () => {
      toast.success('Payment approved — library access granted!');
      qc.invalidateQueries({ queryKey: ['pending-orders'] });
    },
    onError: () => toast.error('Approval failed.'),
  });

  const approveBatchMutation = useMutation({
    mutationFn: (orderIds: string[]) =>
      api.post('/payment/orders/approve-batch', { orderIds }),
    onSuccess: (_, orderIds) => {
      toast.success(`${orderIds.length} payment(s) approved!`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['pending-orders'] });
    },
    onError: () => toast.error('Batch approval failed.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      api.post(`/payment/orders/${orderId}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Payment rejected.');
      qc.invalidateQueries({ queryKey: ['pending-orders'] });
    },
    onError: () => toast.error('Rejection failed.'),
  });

  const allIds = orders?.map((o) => o.id) ?? [];
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <BackButton fallback="/admin" />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold">Pending payments</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {orders?.length ?? 0} waiting for review
          </p>
        </div>
        {someSelected && (
          <Button
            loading={approveBatchMutation.isPending}
            onClick={() => approveBatchMutation.mutate([...selected])}
          >
            ✓ Approve selected ({selected.size})
          </Button>
        )}
      </div>

      {!orders?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--muted-foreground)]">
          <span className="text-5xl">✅</span>
          <p className="mt-3 text-sm">No pending payments</p>
        </div>
      ) : (
        <>
          {/* Select all row */}
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="w-4 h-4 rounded accent-violet-600"
            />
            Select all ({allIds.length})
          </label>

          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className={`rounded-xl border overflow-hidden transition-colors ${
                  selected.has(order.id)
                    ? 'border-violet-500 ring-1 ring-violet-500'
                    : 'border-[var(--border)]'
                }`}
              >
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={selected.has(order.id)}
                    onChange={() => toggleOne(order.id)}
                    className="w-4 h-4 rounded accent-violet-600 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{order.user.displayName}</p>
                    <p className="text-xs text-[var(--muted-foreground)] truncate">{order.user.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-violet-600">฿{Number(order.totalTHB).toLocaleString()}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {new Date(order.createdAt).toLocaleDateString('th-TH')}
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div className="px-4 py-3 space-y-1">
                  {order.orderItems.map((item) => (
                    <p key={item.id} className="text-sm text-[var(--muted-foreground)]">
                      • {item.product?.title ?? item.productId}
                    </p>
                  ))}
                </div>

                {/* Payment slip */}
                {order.payment && (
                  <div className="px-4 py-3 border-t border-[var(--border)] space-y-3">
                    <div className="flex items-start gap-3">
                      {order.payment.slipUrl && (
                        <a href={order.payment.slipUrl} target="_blank" rel="noreferrer" className="shrink-0">
                          <div className="relative h-24 w-16 rounded border border-[var(--border)] overflow-hidden">
                            <Image src={order.payment.slipUrl} alt="Payment slip" fill className="object-cover" />
                          </div>
                        </a>
                      )}
                      <div className="text-sm space-y-1 min-w-0">
                        {order.payment.transferredAt && (
                          <p className="text-[var(--muted-foreground)]">
                            Transferred:{' '}
                            <span className="font-medium text-[var(--foreground)]">
                              {new Date(order.payment.transferredAt).toLocaleString('th-TH')}
                            </span>
                          </p>
                        )}
                        {order.payment.note && (
                          <p className="text-[var(--muted-foreground)] break-words">Note: {order.payment.note}</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        loading={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(order.id)}
                      >
                        ✓ Approve
                      </Button>
                      {/* Reject — stack on mobile so Input doesn't get squished */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          placeholder="Rejection reason (required to reject)"
                          value={rejectReason[order.id] ?? ''}
                          onChange={(e) =>
                            setRejectReason((r) => ({ ...r, [order.id]: e.target.value }))
                          }
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          className="sm:shrink-0"
                          loading={rejectMutation.isPending}
                          disabled={!rejectReason[order.id]}
                          onClick={() =>
                            rejectMutation.mutate({ orderId: order.id, reason: rejectReason[order.id] })
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
