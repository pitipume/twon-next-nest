'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Upload, FileText, Image, Archive } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type UploadType = 'ebook' | 'tarot';

const ebookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  description: z.string().optional(),
  priceTHB: z.coerce.number().min(0, 'Price must be 0 or more'),
  language: z.string().default('th'),
  categories: z.string().optional(),
  tags: z.string().optional(),
  previewPages: z.coerce.number().min(0).default(0),
});

const tarotSchema = z.object({
  name: z.string().min(1, 'Deck name is required'),
  description: z.string().optional(),
  priceTHB: z.coerce.number().min(0, 'Price must be 0 or more'),
});

type EbookForm = z.infer<typeof ebookSchema>;
type TarotForm = z.infer<typeof tarotSchema>;

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm font-medium text-[var(--foreground)]">
      {children} <span className="text-red-500">*</span>
    </span>
  );
}

function FilePickerButton({
  label,
  required,
  accept,
  hint,
  file,
  icon: Icon,
  error,
  onChange,
}: {
  label: string;
  required?: boolean;
  accept: string;
  hint?: string;
  file: File | null;
  icon: React.ElementType;
  error?: string | null;
  onChange: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[var(--foreground)]">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {hint && <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>}
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`flex items-center gap-3 w-full rounded-lg border px-4 py-3 text-sm transition-colors hover:bg-[var(--muted)] ${
          error
            ? 'border-red-500'
            : file
            ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20'
            : 'border-[var(--border)] bg-[var(--muted)]'
        }`}
      >
        <Icon size={16} className={file ? 'text-violet-500' : 'text-[var(--muted-foreground)]'} />
        <span className={file ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}>
          {file ? file.name : `Choose ${label.toLowerCase()}`}
        </span>
        {!file && (
          <Upload size={14} className="ml-auto text-[var(--muted-foreground)]" />
        )}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
    </div>
  );
}

export default function UploadPage() {
  const router = useRouter();
  const [uploadType, setUploadType] = useState<UploadType>('ebook');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);

  const ebookForm = useForm<EbookForm>({ resolver: zodResolver(ebookSchema) });
  const tarotForm = useForm<TarotForm>({ resolver: zodResolver(tarotSchema) });

  async function onSubmitEbook(data: EbookForm) {
    if (!pdfFile) { setPdfError('PDF file is required'); return; }
    setPdfError(null);
    const form = new FormData();
    Object.entries(data).forEach(([k, v]) => v !== undefined && form.append(k, String(v)));
    form.append('pdf', pdfFile);
    if (coverFile) form.append('cover', coverFile);
    try {
      await api.post('/admin/ebooks', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Ebook uploaded!');
      router.push('/admin');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Upload failed. Check console for details.';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  }

  async function onSubmitTarot(data: TarotForm) {
    if (!zipFile) { setZipError('ZIP file is required'); return; }
    setZipError(null);
    const form = new FormData();
    Object.entries(data).forEach(([k, v]) => form.append(k, String(v)));
    form.append('zip', zipFile);
    if (coverFile) form.append('cover', coverFile);
    if (backFile) form.append('back', backFile);
    try {
      await api.post('/admin/tarot-decks', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Tarot deck uploaded!');
      router.push('/admin');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Upload failed. Check console for details.';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Upload content</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Add a new ebook or tarot deck</p>
      </div>

      <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
        {(['ebook', 'tarot'] as UploadType[]).map((t) => (
          <button
            key={t}
            type="button"
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
        <form onSubmit={ebookForm.handleSubmit(onSubmitEbook, () => {
          if (!pdfFile) setPdfError('PDF file is required');
          toast.error('Please fill in all required fields.');
        })} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <RequiredLabel>Title</RequiredLabel>
            <input
              {...ebookForm.register('title')}
              placeholder="Book title"
              className={`h-10 w-full rounded-lg border bg-[var(--background)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${ebookForm.formState.errors.title ? 'border-red-500' : 'border-[var(--border)]'}`}
            />
            {ebookForm.formState.errors.title && <p className="text-xs text-red-500">{ebookForm.formState.errors.title.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <RequiredLabel>Author</RequiredLabel>
            <input
              {...ebookForm.register('author')}
              placeholder="Author name"
              className={`h-10 w-full rounded-lg border bg-[var(--background)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${ebookForm.formState.errors.author ? 'border-red-500' : 'border-[var(--border)]'}`}
            />
            {ebookForm.formState.errors.author && <p className="text-xs text-red-500">{ebookForm.formState.errors.author.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Description</span>
            <textarea
              {...ebookForm.register('description')}
              rows={3}
              placeholder="Short description (optional)"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <RequiredLabel>Price (THB)</RequiredLabel>
              <input
                {...ebookForm.register('priceTHB')}
                type="number"
                min="0"
                placeholder="0"
                className={`h-10 w-full rounded-lg border bg-[var(--background)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${ebookForm.formState.errors.priceTHB ? 'border-red-500' : 'border-[var(--border)]'}`}
              />
              {ebookForm.formState.errors.priceTHB && <p className="text-xs text-red-500">{ebookForm.formState.errors.priceTHB.message}</p>}
            </div>
            <Input label="Language" placeholder="th" {...ebookForm.register('language')} />
          </div>

          <Input label="Categories (comma separated)" placeholder="fiction, romance" {...ebookForm.register('categories')} />
          <Input label="Tags (comma separated)" placeholder="love, drama" {...ebookForm.register('tags')} />

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Free preview pages</span>
            <input
              {...ebookForm.register('previewPages')}
              type="number"
              min="0"
              placeholder="0"
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <FilePickerButton
            label="PDF file"
            required
            accept=".pdf"
            file={pdfFile}
            icon={FileText}
            error={pdfError}
            onChange={(f) => { setPdfFile(f); if (f) setPdfError(null); }}
          />

          <FilePickerButton
            label="Cover image"
            accept="image/*"
            file={coverFile}
            icon={Image}
            onChange={setCoverFile}
          />

          <Button type="submit" className="w-full" loading={ebookForm.formState.isSubmitting}>
            Upload ebook
          </Button>
        </form>
      ) : (
        <form onSubmit={tarotForm.handleSubmit(onSubmitTarot, () => {
          if (!zipFile) setZipError('ZIP file is required');
          toast.error('Please fill in all required fields.');
        })} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <RequiredLabel>Deck name</RequiredLabel>
            <input
              {...tarotForm.register('name')}
              placeholder="Deck name"
              className={`h-10 w-full rounded-lg border bg-[var(--background)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${tarotForm.formState.errors.name ? 'border-red-500' : 'border-[var(--border)]'}`}
            />
            {tarotForm.formState.errors.name && <p className="text-xs text-red-500">{tarotForm.formState.errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Description</span>
            <textarea
              {...tarotForm.register('description')}
              rows={3}
              placeholder="Short description (optional)"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <RequiredLabel>Price (THB)</RequiredLabel>
            <input
              {...tarotForm.register('priceTHB')}
              type="number"
              min="0"
              placeholder="0"
              className={`h-10 w-full rounded-lg border bg-[var(--background)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${tarotForm.formState.errors.priceTHB ? 'border-red-500' : 'border-[var(--border)]'}`}
            />
            {tarotForm.formState.errors.priceTHB && <p className="text-xs text-red-500">{tarotForm.formState.errors.priceTHB.message}</p>}
          </div>

          <FilePickerButton
            label="Card images ZIP"
            required
            accept=".zip"
            hint="Name files as: 00_the_fool.webp, 01_the_magician.webp…"
            file={zipFile}
            icon={Archive}
            error={zipError}
            onChange={(f) => { setZipFile(f); if (f) setZipError(null); }}
          />

          <FilePickerButton
            label="Cover image"
            accept="image/*"
            file={coverFile}
            icon={Image}
            onChange={setCoverFile}
          />

          <FilePickerButton
            label="Card back image"
            accept="image/*"
            file={backFile}
            icon={Image}
            onChange={setBackFile}
          />

          <Button type="submit" className="w-full" loading={tarotForm.formState.isSubmitting}>
            Upload tarot deck
          </Button>
        </form>
      )}
    </div>
  );
}
