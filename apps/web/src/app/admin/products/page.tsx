'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';

interface AdminProduct {
  id: string;
  title: string;
  productType: 'EBOOK' | 'TAROT_DECK';
  priceTHB: number;
  isPublished: boolean;
  createdAt: string;
}

export default function AdminProductsPage() {
  const qc = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const res = await api.get('/admin/products');
      return res.data as AdminProduct[];
    },
  });

  const publishMutation = useMutation({
    mutationFn: ({ id, publish }: { id: string; publish: boolean }) =>
      api.patch(`/admin/products/${id}/${publish ? 'publish' : 'unpublish'}`),
    onSuccess: (_, { publish }) => {
      toast.success(publish ? 'Product published — now visible to customers.' : 'Product unpublished.');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: () => toast.error('Failed to update.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/products/${id}`),
    onSuccess: () => {
      toast.success('Product deleted.');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to delete.';
      toast.error(msg);
    },
  });

  function confirmDelete(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    deleteMutation.mutate(id);
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Manage visibility of uploaded content
        </p>
      </div>

      {!products?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--muted-foreground)]">
          <span className="text-5xl">📭</span>
          <p className="mt-3 text-sm">No products yet — upload one first</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={p.productType === 'EBOOK' ? 'default' : 'warning'}>
                    {p.productType === 'EBOOK' ? 'Ebook' : 'Tarot'}
                  </Badge>
                  {p.isPublished ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">Live</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[var(--muted-foreground)]">Draft</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm font-medium truncate">{p.title}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  ฿{Number(p.priceTHB).toLocaleString()} · {new Date(p.createdAt).toLocaleDateString('th-TH')}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!p.isPublished && (
                  <Button
                    size="sm"
                    variant="outline"
                    loading={deleteMutation.isPending}
                    onClick={() => confirmDelete(p.id, p.title)}
                    className="text-red-500 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    Delete
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={p.isPublished ? 'outline' : 'primary'}
                  loading={publishMutation.isPending}
                  onClick={() => publishMutation.mutate({ id: p.id, publish: !p.isPublished })}
                >
                  {p.isPublished ? 'Unpublish' : 'Publish'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
