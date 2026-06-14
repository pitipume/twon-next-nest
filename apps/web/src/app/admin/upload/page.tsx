'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Upload, FileText, Image, Archive } from 'lucide-react';
import { Features } from '@/config/features';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ─── File helpers ──────────────────────────────────────────────────────────

async function parsePdf(file: File): Promise<{ thumbnail: File | null; numPages: number }> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    const arrayBuffer = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = doc.numPages;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d') as any, viewport }).promise;
    const thumbnail = await new Promise<File | null>((resolve) =>
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], 'auto-cover.webp', { type: 'image/webp' }) : null),
        'image/webp',
        0.85,
      ),
    );
    return { thumbnail, numPages };
  } catch {
    return { thumbnail: null, numPages: 0 };
  }
}

function imageToWebP(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 600;
      const ctx = canvas.getContext('2d')!;
      const scale = Math.max(400 / img.width, 600 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (400 - w) / 2, (600 - h) / 2, w, h);
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(new File([blob], 'cover.webp', { type: 'image/webp' }))
            : reject(new Error('Cover conversion failed')),
        'image/webp',
        0.85,
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

function uploadToR2(
  url: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`R2 upload failed: HTTP ${xhr.status}`));
    xhr.onerror = () => reject(new Error('Network error during file upload'));
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(file);
  });
}

// ─── Types ─────────────────────────────────────────────────────────────────

type UploadType = 'ebook' | 'tarot';
type UploadStep = 'idle' | 'preparing' | 'uploading' | 'saving';

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

// ─── Sub-components ────────────────────────────────────────────────────────

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
        {!file && <Upload size={14} className="ml-auto text-[var(--muted-foreground)]" />}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function ProgressBar({ step, progress }: { step: UploadStep; progress: number }) {
  const label =
    step === 'preparing'
      ? 'Preparing upload…'
      : step === 'uploading'
      ? `Uploading… ${progress}%`
      : step === 'saving'
      ? 'Saving…'
      : '';

  return (
    <div className="space-y-2">
      <div className="h-2 w-full rounded-full bg-[var(--muted)] overflow-hidden">
        <div
          className="h-full bg-violet-600 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-center text-sm text-[var(--muted-foreground)]">{label}</p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router = useRouter();
  const [uploadType, setUploadType] = useState<UploadType>('ebook');

  // Ebook file state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [autoCover, setAutoCover] = useState<File | null>(null);
  const [pdfNumPages, setPdfNumPages] = useState(0);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Tarot file state
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [tarotCoverFile, setTarotCoverFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);

  // Upload progress
  const [uploadStep, setUploadStep] = useState<UploadStep>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);

  const ebookForm = useForm<EbookForm>({ resolver: zodResolver(ebookSchema) });
  const tarotForm = useForm<TarotForm>({ resolver: zodResolver(tarotSchema) });

  async function handlePdfChange(file: File | null) {
    setPdfFile(file);
    if (file) {
      setPdfError(null);
      setGeneratingCover(true);
      const { thumbnail, numPages } = await parsePdf(file);
      setAutoCover(thumbnail);
      setPdfNumPages(numPages);
      setGeneratingCover(false);
    } else {
      setAutoCover(null);
      setPdfNumPages(0);
    }
  }

  async function onSubmitEbook(data: EbookForm) {
    if (!pdfFile) { setPdfError('PDF file is required'); return; }
    setPdfError(null);

    try {
      // Step 1: get presigned upload URLs
      setUploadStep('preparing');
      setUploadProgress(5);
      const { data: urls } = await api.post('/admin/ebooks/upload-urls');

      // Step 2: upload PDF directly to R2
      setUploadStep('uploading');
      await uploadToR2(urls.pdf.url, pdfFile, 'application/pdf', (pct) => {
        // PDF progress = 0–88% of total bar
        setUploadProgress(5 + Math.round(pct * 0.83));
      });

      // Step 3: upload cover to R2 (auto-generated or manually selected)
      let coverKey: string | undefined;
      const effectiveCover = coverFile ?? autoCover;
      if (effectiveCover) {
        setUploadProgress(90);
        const readyCover = coverFile ? await imageToWebP(coverFile) : effectiveCover;
        await uploadToR2(urls.cover.url, readyCover, 'image/webp', (pct) => {
          setUploadProgress(90 + Math.round(pct * 0.07));
        });
        coverKey = urls.cover.key;
      }

      // Step 4: confirm — backend saves metadata
      setUploadStep('saving');
      setUploadProgress(98);
      await api.post('/admin/ebooks', {
        ...data,
        pdfKey: urls.pdf.key,
        coverKey,
        totalPages: pdfNumPages,
      });

      setUploadProgress(100);
      toast.success('Ebook uploaded!');
      router.push('/admin');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Upload failed.';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
      setUploadStep('idle');
    }
  }

  async function onSubmitTarot(data: TarotForm) {
    if (!zipFile) { setZipError('ZIP file is required'); return; }
    setZipError(null);

    try {
      // Step 1: get presigned upload URLs
      setUploadStep('preparing');
      setUploadProgress(5);
      const { data: urls } = await api.post('/admin/tarot-decks/upload-urls');

      // Step 2: upload ZIP directly to R2
      setUploadStep('uploading');
      await uploadToR2(urls.zip.url, zipFile, 'application/zip', (pct) => {
        setUploadProgress(5 + Math.round(pct * 0.75));
      });

      // Step 3: upload cover + back images
      let coverKey: string | undefined;
      let backKey: string | undefined;

      if (tarotCoverFile) {
        setUploadProgress(82);
        const readyCover = await imageToWebP(tarotCoverFile);
        await uploadToR2(urls.cover.url, readyCover, 'image/webp', (pct) => {
          setUploadProgress(82 + Math.round(pct * 0.07));
        });
        coverKey = urls.cover.key;
      }

      if (backFile) {
        setUploadProgress(90);
        const readyBack = await imageToWebP(backFile);
        await uploadToR2(urls.back.url, readyBack, 'image/webp', (pct) => {
          setUploadProgress(90 + Math.round(pct * 0.07));
        });
        backKey = urls.back.key;
      }

      // Step 4: confirm — backend downloads ZIP, processes cards
      setUploadStep('saving');
      setUploadProgress(98);
      await api.post('/admin/tarot-decks', {
        ...data,
        zipKey: urls.zip.key,
        coverKey,
        backKey,
      });

      setUploadProgress(100);
      toast.success('Tarot deck uploaded! Cards are being processed.');
      router.push('/admin');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Upload failed.';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
      setUploadStep('idle');
    }
  }

  const isBusy = uploadStep !== 'idle';

  return (
    <div className="mx-auto max-w-xl px-4 py-10 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Upload content</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Add a new ebook or tarot deck</p>
      </div>

      <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
        {(['ebook', ...(Features.etarot ? ['tarot'] : [])] as UploadType[]).map((t) => (
          <button
            key={t}
            type="button"
            disabled={isBusy}
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
        <form
          onSubmit={ebookForm.handleSubmit(onSubmitEbook, () => {
            if (!pdfFile) setPdfError('PDF file is required');
            toast.error('Please fill in all required fields.');
          })}
          className="space-y-4"
        >
          <div className="flex flex-col gap-1.5">
            <RequiredLabel>Title</RequiredLabel>
            <input
              {...ebookForm.register('title')}
              placeholder="Book title"
              className={`h-10 w-full rounded-lg border bg-[var(--background)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${ebookForm.formState.errors.title ? 'border-red-500' : 'border-[var(--border)]'}`}
            />
            {ebookForm.formState.errors.title && (
              <p className="text-xs text-red-500">{ebookForm.formState.errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <RequiredLabel>Author</RequiredLabel>
            <input
              {...ebookForm.register('author')}
              placeholder="Author name"
              className={`h-10 w-full rounded-lg border bg-[var(--background)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${ebookForm.formState.errors.author ? 'border-red-500' : 'border-[var(--border)]'}`}
            />
            {ebookForm.formState.errors.author && (
              <p className="text-xs text-red-500">{ebookForm.formState.errors.author.message}</p>
            )}
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
              {ebookForm.formState.errors.priceTHB && (
                <p className="text-xs text-red-500">{ebookForm.formState.errors.priceTHB.message}</p>
              )}
            </div>
            <Input label="Language" placeholder="th" {...ebookForm.register('language')} />
          </div>

          <Input
            label="Categories (comma separated)"
            placeholder="fiction, romance"
            {...ebookForm.register('categories')}
          />
          <Input
            label="Tags (comma separated)"
            placeholder="love, drama"
            {...ebookForm.register('tags')}
          />

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
            onChange={handlePdfChange}
          />

          <FilePickerButton
            label="Cover image"
            accept="image/*"
            hint={
              generatingCover
                ? 'Generating from page 1…'
                : autoCover && !coverFile
                ? 'Using page 1 as cover (auto)'
                : undefined
            }
            file={coverFile}
            icon={Image}
            onChange={setCoverFile}
          />

          {isBusy && <ProgressBar step={uploadStep} progress={uploadProgress} />}

          <Button type="submit" className="w-full" loading={isBusy} disabled={isBusy}>
            Upload ebook
          </Button>
        </form>
      ) : (
        <form
          onSubmit={tarotForm.handleSubmit(onSubmitTarot, () => {
            if (!zipFile) setZipError('ZIP file is required');
            toast.error('Please fill in all required fields.');
          })}
          className="space-y-4"
        >
          <div className="flex flex-col gap-1.5">
            <RequiredLabel>Deck name</RequiredLabel>
            <input
              {...tarotForm.register('name')}
              placeholder="Deck name"
              className={`h-10 w-full rounded-lg border bg-[var(--background)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${tarotForm.formState.errors.name ? 'border-red-500' : 'border-[var(--border)]'}`}
            />
            {tarotForm.formState.errors.name && (
              <p className="text-xs text-red-500">{tarotForm.formState.errors.name.message}</p>
            )}
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
            {tarotForm.formState.errors.priceTHB && (
              <p className="text-xs text-red-500">{tarotForm.formState.errors.priceTHB.message}</p>
            )}
          </div>

          <FilePickerButton
            label="Card images ZIP"
            required
            accept=".zip"
            hint="Name files as: 00_the_fool.webp, 01_the_magician.webp…"
            file={zipFile}
            icon={Archive}
            error={zipError}
            onChange={(f) => {
              setZipFile(f);
              if (f) setZipError(null);
            }}
          />

          <FilePickerButton
            label="Cover image"
            accept="image/*"
            file={tarotCoverFile}
            icon={Image}
            onChange={setTarotCoverFile}
          />

          <FilePickerButton
            label="Card back image"
            accept="image/*"
            file={backFile}
            icon={Image}
            onChange={setBackFile}
          />

          {isBusy && <ProgressBar step={uploadStep} progress={uploadProgress} />}

          <Button type="submit" className="w-full" loading={isBusy} disabled={isBusy}>
            Upload tarot deck
          </Button>
        </form>
      )}
    </div>
  );
}
