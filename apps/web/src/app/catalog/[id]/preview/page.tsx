'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useVirtualizer } from '@tanstack/react-virtual';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function DocLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-[var(--muted-foreground)]">
      <div className="w-8 h-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
      <span className="text-sm">Loading preview…</span>
    </div>
  );
}

function PageSkeleton({ width }: { width: number }) {
  return (
    <div
      style={{ width, height: Math.round(width * 1.414) }}
      className="rounded-sm bg-zinc-200 dark:bg-zinc-700 animate-pulse"
    />
  );
}

interface PreviewSession {
  pdfUrl: string;
  previewPages: number;
  title: string;
}

export default function EbookPreviewPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [numPages, setNumPages] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pageWidth, setPageWidth] = useState(() =>
    typeof window !== 'undefined' ? Math.min(window.innerWidth - 24, 800) : 400,
  );

  const { data: session, isLoading } = useQuery({
    queryKey: ['ebook-preview', id],
    queryFn: async () => {
      const res = await api.get(`/catalog/${id}/preview`);
      return res.data.data as PreviewSession;
    },
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setPageWidth(Math.min(el.clientWidth - 24, 800));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [session]);

  const previewCount = session?.previewPages ?? 0;
  const visiblePages = Math.min(numPages, previewCount);

  const virtualizer = useVirtualizer({
    count: visiblePages,
    getScrollElement: () => containerRef.current,
    estimateSize: () => Math.round(pageWidth * 1.414) + 16,
    overscan: 2,
  });

  const onDocumentLoad = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  if (isLoading) return <PageSpinner />;
  if (!session) return <div className="p-10 text-center">Preview not available.</div>;

  return (
    <div className="flex flex-col h-[calc(100svh-56px)]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-2 bg-[var(--background)]">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-[var(--muted)] transition-colors shrink-0"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{session.title}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Preview — {previewCount} pages</p>
        </div>
        <Button size="sm" onClick={() => router.push(`/catalog/${id}`)}>
          Buy to read more
        </Button>
      </div>

      {/* PDF viewer — scroll mode, capped at previewPages */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-auto bg-zinc-100 dark:bg-zinc-900 select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        <Document
          file={session.pdfUrl}
          onLoadSuccess={onDocumentLoad}
          loading={<DocLoader />}
          error={
            <div className="flex flex-col items-center gap-2 py-20 text-sm text-red-500">
              <span>Failed to load preview.</span>
              <button onClick={() => window.location.reload()} className="underline text-violet-600">
                Tap to retry
              </button>
            </div>
          }
        >
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
            {virtualizer.getVirtualItems().map((item) => (
              <div
                key={item.key}
                data-index={item.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${item.start}px)`,
                }}
                className="flex justify-center py-2 px-3"
              >
                <Page
                  pageNumber={item.index + 1}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="shadow-lg rounded-sm overflow-hidden max-w-full"
                  width={pageWidth}
                  loading={<PageSkeleton width={pageWidth} />}
                />
              </div>
            ))}
          </div>
        </Document>

        {/* Paywall shown after last preview page once PDF has loaded */}
        {numPages > 0 && (
          <div className="flex flex-col items-center gap-4 py-16 px-6 text-center border-t border-[var(--border)]">
            <span className="text-4xl">📖</span>
            <div className="space-y-1">
              <p className="font-semibold">You've reached the end of the preview</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Buy the full book to keep reading all {session.title} pages.
              </p>
            </div>
            <Button size="lg" onClick={() => router.push(`/catalog/${id}`)}>
              Buy now →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
