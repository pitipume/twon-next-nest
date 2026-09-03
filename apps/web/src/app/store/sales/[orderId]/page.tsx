'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { BackButton } from '@/components/ui/back-button';
import { PageSpinner } from '@/components/ui/spinner';
import api from '@/lib/api';

interface OrderDetail {
  id: string;
  status: string;
  totalTHB: number;
  createdAt: string;
  buyer: { id: string; displayName: string; email: string };
  items: {
    id: string;
    productId: string;
    title: string;
    productType: string;
    priceTHB: number;
    commissionAmount: number | null;
    netAmount: number | null;
  }[];
  payment: {
    status: string;
    transferredAt: string | null;
    note: string | null;
    approvedAt: string | null;
    rejectionReason: string | null;
    slipUrl: string | null;
  } | null;
}

export default function StoreOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      const res = await api.get(`/admin/orders/${orderId}`);
      return res.data.data as OrderDetail | null;
    },
  });

  if (isLoading) return <PageSpinner />;

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
        <BackButton fallback="/store/sales" />
        <p className="text-sm text-[var(--muted-foreground)]">Order not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <BackButton fallback="/store/sales" />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Order detail</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{new Date(order.createdAt).toLocaleString('th-TH')}</p>
      </div>

      <div className="rounded-xl border border-[var(--border)] p-4">
        <p className="text-sm font-medium">{order.buyer.displayName}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{order.buyer.email}</p>
      </div>

      <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
        {order.items.map((i) => (
          <div key={i.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{i.title}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{i.productType}</p>
            </div>
            <div className="text-right">
              <p className="text-sm">฿{i.priceTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
              {i.netAmount !== null && (
                <p className="text-xs text-emerald-600">Net ฿{i.netAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {order.payment && (
        <div className="space-y-2 rounded-xl border border-[var(--border)] p-4">
          <h2 className="text-sm font-medium">Payment</h2>
          <p className="text-sm">Status: {order.payment.status}</p>
          {order.payment.transferredAt && (
            <p className="text-xs text-[var(--muted-foreground)]">
              Transferred: {new Date(order.payment.transferredAt).toLocaleString('th-TH')}
            </p>
          )}
          {order.payment.note && <p className="text-xs text-[var(--muted-foreground)]">Note: {order.payment.note}</p>}
          {order.payment.rejectionReason && (
            <p className="text-xs text-red-500">Rejected: {order.payment.rejectionReason}</p>
          )}
          {order.payment.slipUrl && (
            <div className="relative h-48 w-36 overflow-hidden rounded-lg border border-[var(--border)]">
              <Image src={order.payment.slipUrl} alt="Payment slip" fill className="object-cover" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
