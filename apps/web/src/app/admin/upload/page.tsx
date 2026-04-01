'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type UploadType = 'ebook' | 'tarot';

const ebookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  description: z.string().min(1),
  priceTHB: z.coerce.number().min(0),
  language: z.string().default('th'),
  categories: z.string().optional(),
  tags: z.string().optional(),
  previewPages: z.coerce.number().min(0).default(0),
});

const tarotSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  priceTHB: z.coerce.number().min(0),
});

type EbookForm = z.infer<typeof ebookSchema>;
type TarotForm = z.infer<typeof tarotSchema>;

export default function UploadPage() {
  const router = useRouter();
  const [uploadType, setUploadType] = useState<UploadType>('ebook');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

  const ebookForm = useForm<EbookForm>({ resolver: zodResolver(ebookSchema) });
  const tarotForm = useForm<TarotForm>({ resolver: zodResolver(tarotSchema) });

  async function onSubmitEbook(data: EbookForm) {
    if (!pdfFile) return toast.error('PDF file is required');
    const form = new FormData();
    Object.entries(data).forEach(([k, v]) => v !== undefined && form.append(k, String(v)));
    form.append('pdf', pdfFile);
    if (coverFile) form.append('cover', coverFile);
    try {
      await api.post('/admin/ebooks', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Ebook uploaded!');
      router.push('/admin');
    } catch {
      toast.error('Upload failed.');
    }
  }

  async function onSubmitTarot(data: TarotForm) {
    if (!zipFile) return toast.error('ZIP file is required');
    const form = new FormData();
    Object.entries(data).forEach(([k, v]) => form.append(k, String(v)));
    form.append('zip', zipFile);
    if (coverFile) form.append('cover', coverFile);
    if (backFile) form.append('back', backFile);
    try {
      await api.post('/admin/tarot-decks', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Tarot deck uploaded!');
      router.push('/admin');
    } catch {
      toast.error('Upload failed.');
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Upload content</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Add a new ebook or tarot deck</p>
      </div>

      {/* Type selector */}
      <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
        {(['ebook', 'tarot'] as UploadType[]).map((t) => (
          <button
            key={t}
            onClick={() => setUploadType(t)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              uploadType === t
                ? 'bg-violet-600 text-white'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
            }`}
          >
            {t === 'ebook' ? '📖 Ebook' : '🃏 Tarot Deck'}
          </button>
        ))}
      </div>

      {uploadType === 'ebook' ? (
        <form onSubmit={ebookForm.handleSubmit(onSubmitEbook)} className="space-y-4">
          <Input label="Title" error={ebookForm.formState.errors.title?.message} {...ebookForm.register('title')} />
          <Input label="Author" error={ebookForm.formState.errors.author?.message} {...ebookForm.register('author')} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Description</label>
            <textarea
              {...ebookForm.register('description')}
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price (THB)" type="number" {...ebookForm.register('priceTHB')} />
            <Input label="Language" placeholder="th" {...ebookForm.register('language')} />
          </div>
          <Input label="Categories (comma separated)" placeholder="fiction, romance" {...ebookForm.register('categories')} />
          <Input label="Tags (comma separated)" {...ebookForm.register('tags')} />
          <Input label="Free preview pages" type="number" {...ebookForm.register('previewPages')} />

          <div className="space-y-2">
            <label className="text-sm font-medium">PDF file *</label>
            <input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-[var(--muted-foreground)]" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Cover image (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-[var(--muted-foreground)]" />
          </div>

          <Button type="submit" className="w-full" loading={ebookForm.formState.isSubmitting}>
            Upload ebook
          </Button>
        </form>
      ) : (
        <form onSubmit={tarotForm.handleSubmit(onSubmitTarot)} className="space-y-4">
          <Input label="Deck name" error={tarotForm.formState.errors.name?.message} {...tarotForm.register('name')} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Description</label>
            <textarea
              {...tarotForm.register('description')}
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <Input label="Price (THB)" type="number" {...tarotForm.register('priceTHB')} />

          <div className="space-y-2">
            <label className="text-sm font-medium">Card images ZIP *</label>
            <p className="text-xs text-[var(--muted-foreground)]">Name files as: 00_the_fool.webp, 01_the_magician.webp…</p>
            <input type="file" accept=".zip" onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-[var(--muted-foreground)]" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Cover image (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-[var(--muted-foreground)]" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Card back image (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setBackFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-[var(--muted-foreground)]" />
          </div>

          <Button type="submit" className="w-full" loading={tarotForm.formState.isSubmitting}>
            Upload tarot deck
          </Button>
        </form>
      )}
    </div>
  );
}
