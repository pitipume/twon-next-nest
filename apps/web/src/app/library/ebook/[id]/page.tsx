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
      return (localStorage.getItem('ebook-read-mode') as ReadMode) ?? 'scroll';
    }
    return 'scroll';
  });

  // null = not yet measured; prevents the 700px flash on mobile before ResizeObserver fires
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setPageWidth(Math.min(el.clientWidth - 24, 800));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Virtual scrolling for scroll mode — only ~5 pages in DOM at any time
  const virtualizer = useVirtualizer({
    count: numPages,
    getScrollElement: () => containerRef.current,
    estimateSize: () => Math.round((pageWidth ?? 400) * 1.414) + 16,
    overscan: 2,
  });

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

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

  // Only fire swipe if horizontal movement is dominant (don't block vertical scroll)
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx > 0) nextPage();
      else prevPage();
    }
  }

  if (isLoading) return <PageSpinner />;
  if (!session) return <div className="p-10 text-center">Could not load ebook.</div>;

  const total = numPages || session.totalPages;

  return (
    // 100dvh = dynamic viewport height — shrinks when mobile browser chrome (address bar) is visible
    <div className="flex flex-col h-[calc(100dvh-56px)]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2 bg-[var(--background)]">
        {/* Mode toggle */}
        <div className="flex rounded-md border border-[var(--border)] overflow-hidden text-xs shrink-0">
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
        </div>

        {mode === 'page' ? (
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={prevPage}
              disabled={currentPage <= 1}
              className="w-9 h-9 flex items-center justify-center rounded-md text-xl disabled:opacity-30 hover:bg-[var(--muted)] active:bg-[var(--muted)] transition-colors touch-manipulation"
            >
              ‹
            </button>
            <span className="text-xs tabular-nums text-[var(--muted-foreground)] min-w-[60px] text-center">
              {currentPage} / {total}
            </span>
            <button
              onClick={nextPage}
              disabled={currentPage >= total}
              className="w-9 h-9 flex items-center justify-center rounded-md text-xl disabled:opacity-30 hover:bg-[var(--muted)] active:bg-[var(--muted)] transition-colors touch-manipulation"
            >
              ›
            </button>
          </div>
        ) : (
          <span className="ml-auto text-xs text-[var(--muted-foreground)]">{total} pages</span>
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
        {/* Don't render until container is measured — prevents the overflow flash on mobile */}
        {pageWidth && (
          <Document file={session.pdfUrl} onLoadSuccess={onDocumentLoad}>
            {mode === 'page' ? (
              // key={currentPage} forces a fresh canvas on page change — fixes black-page bug
              <div className="flex items-center justify-center min-h-full py-4 px-3">
                <Page
                  key={currentPage}
                  pageNumber={currentPage}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="shadow-lg rounded-sm overflow-hidden max-w-full"
                  width={pageWidth}
                />
              </div>
            ) : (
              // Virtual list — only ~5 pages in DOM, safe for 1000+ pages
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
                    />
                  </div>
                ))}
              </div>
            )}
          </Document>
        )}
      </div>
    </div>
  );
}
