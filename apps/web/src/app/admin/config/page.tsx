'use client';

import { useState, useEffect, useRef } from 'react';
import { BackButton } from '@/components/ui/back-button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
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

export default function PaymentConfigPage() {
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    api.get('/admin/payment-config')
      .then(({ data }) => {
        if (data?.data) {
          const cfg = data.data;
          reset({
            bankName: cfg.bankName,
            accountName: cfg.accountName,
            accountNumber: cfg.accountNumber,
            commissionRatePercent: Math.round((cfg.commissionRate ?? 0) * 100),
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reset]);

  async function onSubmit(data: FormData) {
    try {
      const { commissionRatePercent, ...rest } = data;
      await api.put('/admin/payment-config', {
        ...rest,
        commissionRate: commissionRatePercent / 100,
      });
      toast.success('Payment config saved!');
    } catch {
      toast.error('Failed to save config.');
    }
  }

  async function uploadQr() {
    if (!qrFile) return;
    setUploadingQr(true);
    try {
      const form = new FormData();
      form.append('file', qrFile);
      // Do NOT set Content-Type manually — axios sets it with the correct multipart boundary
      await api.post('/admin/payment-config/qr', form);
      toast.success('QR image uploaded!');
      setQrFile(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'QR upload failed.';
      toast.error(msg);
    } finally {
      setUploadingQr(false);
    }
  }

  if (loading) return <PageSpinner />;

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
          {qrFile ? `Selected: ${qrFile.name}` : 'Tap to select QR image (JPG / PNG / WebP)'}
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
