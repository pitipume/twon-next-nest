'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import api from '@/lib/api';
import { EbookSession } from '@/types/product';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';

// react-pdf requires this worker config
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function EbookReaderPage() {
  const { id } = useParams<{ id: string }>();
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: session, isLoading } = useQuery({
    queryKey: ['ebook-session', id],
    queryFn: async () => {
      const res = await api.get(`/library/ebook/${id}/session`);
      return res.data.data as EbookSession;
    },
  });

  const onDocumentLoad = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    if (session?.currentPage) setCurrentPage(session.currentPage);
  }, [session]);

  if (isLoading) return <PageSpinner />;
  if (!session) return <div className="p-10 text-center">Could not load ebook.</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2 bg-[var(--background)]">
        <span className="text-sm font-medium truncate max-w-xs">{session.productId}</span>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            ‹ Prev
          </Button>
          <span className="text-sm text-[var(--muted-foreground)] tabular-nums">
            {currentPage} / {numPages || session.totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage >= (numPages || session.totalPages)}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next ›
          </Button>
        </div>
      </div>

      {/* PDF viewer — no download, no print */}
      <div className="flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-900 flex justify-center py-6">
        <Document
          file={session.pdfUrl}
          onLoadSuccess={onDocumentLoad}
          onContextMenu={(e) => e.preventDefault()}
          className="select-none"
          options={{
            disableRange: false,
            disableStream: false,
          }}
        >
          <Page
            pageNumber={currentPage}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-xl rounded-sm overflow-hidden"
            width={Math.min(window.innerWidth - 48, 800)}
          />
        </Document>
      </div>
    </div>
  );
}
