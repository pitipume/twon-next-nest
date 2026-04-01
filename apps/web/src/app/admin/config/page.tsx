'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const schema = z.object({
  bankName: z.string().min(1),
  accountName: z.string().min(1),
  accountNumber: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

export default function PaymentConfigPage() {
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [uploadingQr, setUploadingQr] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    try {
      await api.put('/admin/payment-config', data);
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
      await api.post('/admin/payment-config/qr', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('QR image uploaded!');
      setQrFile(null);
    } catch {
      toast.error('QR upload failed.');
    } finally {
      setUploadingQr(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Payment config</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Bank details shown at checkout</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Bank name" placeholder="กสิกรไทย" error={errors.bankName?.message} {...register('bankName')} />
        <Input label="Account name" placeholder="ชื่อบัญชี" error={errors.accountName?.message} {...register('accountName')} />
        <Input label="Account number" placeholder="xxx-x-xxxxx-x" error={errors.accountNumber?.message} {...register('accountNumber')} />
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Save bank details
        </Button>
      </form>

      <div className="space-y-3 rounded-xl border border-[var(--border)] p-4">
        <h2 className="text-sm font-medium">PromptPay QR image</h2>
        <p className="text-xs text-[var(--muted-foreground)]">Upload the QR code image customers will scan to pay</p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setQrFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-[var(--muted-foreground)]"
        />
        {qrFile && (
          <Button className="w-full" loading={uploadingQr} onClick={uploadQr}>
            Upload QR image
          </Button>
        )}
      </div>
    </div>
  );
}
