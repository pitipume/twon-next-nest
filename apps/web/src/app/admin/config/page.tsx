'use client';

import { useState, useRef } from 'react';
import { BackButton } from '@/components/ui/back-button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import Image from 'next/image';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageSpinner } from '@/components/ui/spinner';

const schema = z.object({
  bankName: z.string().min(1),
  accountName: z.string().min(1),
  accountNumber: z.string().min(1),
  commissionRatePercent: z.coerce.number().min(0).max(100),
});
type FormData = z.infer<typeof schema>;

interface PaymentConfig {
  bankName: string;
  accountName: string;
  accountNumber: string;
  commissionRate: string | number;
  qrImageKey?: string;
  qrImageUrl?: string;
}

export default function PaymentConfigPage() {
  const qc = useQueryClient();
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ['payment-config'],
    queryFn: async () => {
      const res = await api.get('/admin/payment-config');
      return res.data.data as PaymentConfig | null;
    },
  });

  // `values` syncs the form whenever config changes (on load or after refetch)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: config
      ? {
          bankName: config.bankName,
          accountName: config.accountName,
          accountNumber: config.accountNumber,
          commissionRatePercent: Math.round(Number(config.commissionRate ?? 0) * 100),
        }
      : undefined,
  });

  async function onSubmit(data: FormData) {
    try {
      const { commissionRatePercent, ...rest } = data;
      await api.put('/admin/payment-config', { ...rest, commissionRate: commissionRatePercent / 100 });
      toast.success('Payment config saved!');
      qc.invalidateQueries({ queryKey: ['payment-config'] });
    } catch {
      toast.error('Failed to save config.');
    }
  }

  async function uploadQr() {
    if (!qrFile) return;
    setUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append('file', qrFile);
      await api.post('/admin/payment-config/qr', formData);
      toast.success('QR image uploaded!');
      setQrFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      qc.invalidateQueries({ queryKey: ['payment-config'] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'QR upload failed.';
      toast.error(msg);
    } finally {
      setUploadingQr(false);
    }
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-lg px-4 py-10 space-y-8">
      <BackButton fallback="/admin" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Payment config</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Bank details shown at checkout</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Bank name" placeholder="กสิกรไทย" error={errors.bankName?.message} {...register('bankName')} />
        <Input label="Account name" placeholder="ชื่อบัญชี" error={errors.accountName?.message} {...register('accountName')} />
        <Input label="Account number" placeholder="xxx-x-xxxxx-x" error={errors.accountNumber?.message} {...register('accountNumber')} />
        <div className="space-y-1">
          <Input
            label="Platform commission (%)"
            type="number"
            placeholder="0"
            min={0}
            max={100}
            error={errors.commissionRatePercent?.message}
            {...register('commissionRatePercent')}
          />
          <p className="text-xs text-[var(--muted-foreground)]">Deducted from each sale at approval. 0 = no commission.</p>
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Save bank details
        </Button>
      </form>

      <div className="space-y-3 rounded-xl border border-[var(--border)] p-4">
        <h2 className="text-sm font-medium">PromptPay QR image</h2>
        <p className="text-xs text-[var(--muted-foreground)]">Upload the QR code image customers will scan to pay</p>

        {config?.qrImageUrl && (
          <div className="flex items-center gap-3">
            <div className="relative h-24 w-24 rounded-lg border border-[var(--border)] overflow-hidden bg-white shrink-0">
              <Image src={config.qrImageUrl} alt="Current QR code" fill className="object-contain p-1" />
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">Current QR — tap below to replace</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setQrFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-lg border-2 border-dashed border-[var(--border)] py-4 text-sm text-[var(--muted-foreground)] hover:border-violet-500 hover:text-violet-600 transition-colors active:opacity-70"
        >
          {qrFile ? `Selected: ${qrFile.name}` : config?.qrImageUrl ? 'Tap to replace QR image' : 'Tap to select QR image (JPG / PNG / WebP)'}
        </button>
        {qrFile && (
          <Button className="w-full" loading={uploadingQr} onClick={uploadQr}>
            Upload QR image
          </Button>
        )}
      </div>
    </div>
  );
}
