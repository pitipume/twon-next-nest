'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PendingOrder } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageSpinner } from '@/components/ui/spinner';

export default function PendingOrdersPage() {
  const qc = useQueryClient();
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

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

  const rejectMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      api.post(`/payment/orders/${orderId}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Payment rejected.');
      qc.invalidateQueries({ queryKey: ['pending-orders'] });
    },
    onError: () => toast.error('Rejection failed.'),
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Pending payments</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {orders?.length ?? 0} waiting for review
          </p>
        </div>
      </div>

      {!orders?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--muted-foreground)]">
          <span className="text-5xl">✅</span>
          <p className="mt-3 text-sm">No pending payments</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-[var(--border)] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--muted)]">
                <div>
                  <p className="text-sm font-medium">{order.user.displayName}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{order.user.email}</p>
                </div>
                <div className="text-right">
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
                      <a href={order.payment.slipUrl} target="_blank" rel="noreferrer">
                        <div className="relative h-24 w-16 rounded border border-[var(--border)] overflow-hidden shrink-0">
                          <Image src={order.payment.slipUrl} alt="Payment slip" fill className="object-cover" />
                        </div>
                      </a>
                    )}
                    <div className="text-sm space-y-1">
                      {order.payment.transferredAt && (
                        <p className="text-[var(--muted-foreground)]">
                          Transferred:{' '}
                          <span className="font-medium text-[var(--foreground)]">
                            {new Date(order.payment.transferredAt).toLocaleString('th-TH')}
                          </span>
                        </p>
                      )}
                      {order.payment.note && (
                        <p className="text-[var(--muted-foreground)]">Note: {order.payment.note}</p>
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
                    <div className="flex gap-2">
                      <Input
                        placeholder="Rejection reason..."
                        value={rejectReason[order.id] ?? ''}
                        onChange={(e) =>
                          setRejectReason((r) => ({ ...r, [order.id]: e.target.value }))
                        }
                      />
                      <Button
                        variant="danger"
                        size="sm"
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
      )}
    </div>
  );
}
