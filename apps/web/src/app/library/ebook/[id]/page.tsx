'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Document, Page, pdfjs } from 'react-pdf';
import { useVirtualizer } from '@tanstack/react-virtual';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import api from '@/lib/api';
import type { EbookSession } from '@/types/product';
import { PageSpinner } from '@/components/ui/spinner';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type ReadMode = 'page' | 'scroll';

export default function EbookReaderPage() {
  const { id } = useParams<{ id: string }>();
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [mode, setMode] = useState<ReadMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('ebook-read-mode') as ReadMode) ?? 'page';
    }
    return 'page';
  });

  // Scroll container — doubles as width source and virtual scroll anchor
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(700);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setPageWidth(Math.min(el.clientWidth - 32, 800));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Virtual scrolling for scroll mode — only renders ~5 pages at a time regardless of total
  const virtualizer = useVirtualizer({
    count: numPages,
    getScrollElement: () => containerRef.current,
    // Estimate A4 height + 24px gap — virtualizer self-corrects after measuring real sizes
    estimateSize: () => Math.round(pageWidth * 1.414) + 24,
    overscan: 2, // render 2 extra pages above/below viewport as buffer
  });

  // Touch swipe tracking
  const touchStartX = useRef(0);

  const { data: session, isLoading } = useQuery({
    queryKey: ['ebook-session', id],
    queryFn: async () => {
      const res = await api.get(`/library/ebooks/${id}/session`);
      return res.data.data as EbookSession;
    },
  });

  const onDocumentLoad = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      if (session?.currentPage && session.currentPage > 1) {
        setCurrentPage(session.currentPage);
      }
    },
    [session],
  );

  const prevPage = useCallback(() => setCurrentPage((p) => Math.max(1, p - 1)), []);
  const nextPage = useCallback(
    () => setCurrentPage((p) => Math.min(numPages, p + 1)),
    [numPages],
  );

  // Arrow key navigation in page mode
  useEffect(() => {
    if (mode !== 'page') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextPage();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevPage();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode, nextPage, prevPage]);

  function switchMode(m: ReadMode) {
    setMode(m);
    localStorage.setItem('ebook-read-mode', m);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextPage();
      else prevPage();
    }
  }

  if (isLoading) return <PageSpinner />;
  if (!session) return <div className="p-10 text-center">Could not load ebook.</div>;

  const total = numPages || session.totalPages;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2 bg-[var(--background)]">
        {/* Mode toggle */}
        <div className="flex rounded-md border border-[var(--border)] overflow-hidden text-xs shrink-0">
          <button
            type="button"
            onClick={() => switchMode('page')}
            className={`px-3 py-1.5 font-medium transition-colors ${
              mode === 'page'
                ? 'bg-violet-600 text-white'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
            }`}
          >
            ↔ Page
          </button>
          <button
            type="button"
            onClick={() => switchMode('scroll')}
            className={`px-3 py-1.5 font-medium transition-colors ${
              mode === 'scroll'
                ? 'bg-violet-600 text-white'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
            }`}
          >
            ↕ Scroll
          </button>
        </div>

        {/* Page navigation (page mode) */}
        {mode === 'page' && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={prevPage}
              disabled={currentPage <= 1}
              className="w-8 h-8 flex items-center justify-center rounded text-lg text-[var(--foreground)] disabled:opacity-30 hover:bg-[var(--muted)] transition-colors"
            >
              ‹
            </button>
            <span className="text-sm tabular-nums text-[var(--muted-foreground)] min-w-[80px] text-center">
              {currentPage} / {total}
            </span>
            <button
              onClick={nextPage}
              disabled={currentPage >= total}
              className="w-8 h-8 flex items-center justify-center rounded text-lg text-[var(--foreground)] disabled:opacity-30 hover:bg-[var(--muted)] transition-colors"
            >
              ›
            </button>
          </div>
        )}

        {/* Page count label (scroll mode) */}
        {mode === 'scroll' && (
          <span className="ml-auto text-sm text-[var(--muted-foreground)]">
            {total} pages
          </span>
        )}
      </div>

      {/* PDF viewer */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-900 select-none"
        onContextMenu={(e) => e.preventDefault()}
        onTouchStart={mode === 'page' ? onTouchStart : undefined}
        onTouchEnd={mode === 'page' ? onTouchEnd : undefined}
      >
        <Document file={session.pdfUrl} onLoadSuccess={onDocumentLoad}>
          {mode === 'page' ? (
            // Page mode: single page, key forces fresh canvas → no black-page bug
            <div className="flex items-center justify-center min-h-full py-6 px-4">
              <Page
                key={currentPage}
                pageNumber={currentPage}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-xl rounded-sm overflow-hidden"
                width={pageWidth}
              />
            </div>
          ) : (
            // Scroll mode: virtual list — only ~5 pages in DOM regardless of total page count
            // Safe for 1000+ page PDFs
            <div
              style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
            >
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
                  className="flex justify-center py-3 px-4"
                >
                  <Page
                    pageNumber={item.index + 1}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="shadow-xl rounded-sm overflow-hidden"
                    width={pageWidth}
                  />
                </div>
              ))}
            </div>
          )}
        </Document>
      </div>

      {/* Invisible tap zones for page mode on mobile */}
      {mode === 'page' && numPages > 0 && (
        <div className="absolute inset-0 top-[calc(56px+41px)] pointer-events-none flex">
          <button
            className="flex-1 h-full pointer-events-auto opacity-0"
            onClick={prevPage}
            aria-label="Previous page"
          />
          <button
            className="flex-1 h-full pointer-events-auto opacity-0"
            onClick={nextPage}
            aria-label="Next page"
          />
        </div>
      )}
    </div>
  );
}
