'use client';

import { useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Order } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';

export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();

  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [transferredAt, setTransferredAt] = useState('');
  const [note, setNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const res = await api.get(`/store/orders/${orderId}`);
      return res.data.data as Order;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!slipFile) throw new Error('Select a slip image');
      if (!transferredAt) throw new Error('Enter transfer time');
      const form = new FormData();
      form.append('file', slipFile);
      form.append('orderId', orderId);
      form.append('transferredAt', new Date(transferredAt).toISOString());
      if (note) form.append('note', note);
      await api.post('/payment/slip', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      toast.success('Slip submitted! We will notify you once approved.');
      router.push('/library');
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        'Failed to submit slip.';
      toast.error(message);
    },
  });

  if (isLoading) return <PageSpinner />;
  if (!order) return <div className="p-10 text-center">Order not found.</div>;

  const info = order.checkoutInfo;

  if (order.status === 'COMPLETED') {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center space-y-4">
        <span className="text-5xl">✅</span>
        <h2 className="text-xl font-semibold">Payment approved!</h2>
        <p className="text-[var(--muted-foreground)]">Your items are now in your library.</p>
        <Button onClick={() => router.push('/library')}>Go to Library</Button>
      </div>
    );
  }

  if (order.status === 'WAITING_APPROVAL') {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center space-y-4">
        <span className="text-5xl">⏳</span>
        <h2 className="text-xl font-semibold">Waiting for approval</h2>
        <p className="text-[var(--muted-foreground)]">
          We received your payment slip and are reviewing it. You will get access once approved.
        </p>
        <Button variant="outline" onClick={() => router.push('/')}>Back to catalog</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Complete your payment</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Order #{orderId.slice(0, 8)}</p>
      </div>

      {/* Order summary */}
      <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
        <h2 className="text-sm font-medium">Order summary</h2>
        {order.orderItems?.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-[var(--muted-foreground)]">{item.product?.title ?? item.productId}</span>
            <span>฿{Number(item.priceTHB).toLocaleString()}</span>
          </div>
        ))}
        <div className="border-t border-[var(--border)] pt-2 flex justify-between font-semibold">
          <span>Total</span>
          <span className="text-violet-600">฿{Number(order.totalTHB).toLocaleString()}</span>
        </div>
      </div>

      {/* Payment info */}
      {info ? (
        <div className="rounded-xl border border-[var(--border)] p-4 space-y-4">
          <h2 className="text-sm font-medium">Transfer to</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {info.qrImageUrl && (
              <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
                <Image src={info.qrImageUrl} alt="PromptPay QR" fill className="object-contain p-1" />
              </div>
            )}
            <div className="space-y-1 text-sm">
              <p className="text-[var(--muted-foreground)]">Bank</p>
              <p className="font-medium">{info.bankName}</p>
              <p className="text-[var(--muted-foreground)] mt-2">Account name</p>
              <p className="font-medium">{info.accountName}</p>
              <p className="text-[var(--muted-foreground)] mt-2">Account number</p>
              <p className="font-mono font-semibold text-lg">{info.accountNumber}</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-violet-600">
            Amount to transfer: ฿{Number(order.totalTHB).toLocaleString()}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700">
          Payment details not configured yet. Please contact support.
        </div>
      )}

      {/* Slip upload */}
      <div className="rounded-xl border border-[var(--border)] p-4 space-y-4">
        <h2 className="text-sm font-medium">Upload payment slip</h2>

        {/* File picker */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] py-8 cursor-pointer hover:border-violet-500 transition-colors"
        >
          <span className="text-3xl">{slipFile ? '🧾' : '📁'}</span>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {slipFile ? slipFile.name : 'Click to select slip image (JPG, PNG, WebP, max 5MB)'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="transferredAt"
            label="Transfer date & time"
            type="datetime-local"
            value={transferredAt}
            onChange={(e) => setTransferredAt(e.target.value)}
          />
          <Input
            id="note"
            label="Note (optional)"
            placeholder="e.g. transferred via mobile banking"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <Button
          className="w-full"
          size="lg"
          loading={submitMutation.isPending}
          disabled={!slipFile || !transferredAt}
          onClick={() => submitMutation.mutate()}
        >
          Submit payment slip
        </Button>
      </div>
    </div>
  );
}
