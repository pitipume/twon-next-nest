'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await api.get(`/catalog/products/${id}`);
      return res.data.data as Product;
    },
  });

  const buyMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/store/orders', { productIds: [id] });
      return res.data.data as { id: string };
    },
    onSuccess: (order) => {
      toast.success('Order created!');
      router.push(`/checkout/${order.id}`);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not create order.';
      toast.error(message);
    },
  });

  if (isLoading) return <PageSpinner />;
  if (!product) return <div className="p-10 text-center text-[var(--muted-foreground)]">Product not found.</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-col gap-8 sm:flex-row">
        {/* Cover */}
        <div className="relative aspect-[2/3] w-full max-w-[220px] self-start overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted)] sm:shrink-0">
          {product.coverImageUrl ? (
            <Image src={product.coverImageUrl} alt={product.title} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl">
              {product.productType === 'EBOOK' ? '📖' : '🃏'}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={product.productType === 'EBOOK' ? 'default' : 'warning'}>
                {product.productType === 'EBOOK' ? 'Ebook' : 'Tarot Deck'}
              </Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{product.title}</h1>
            {product.author && (
              <p className="text-[var(--muted-foreground)]">by {product.author}</p>
            )}
          </div>

          {product.description && (
            <p className="leading-relaxed text-[var(--muted-foreground)]">{product.description}</p>
          )}

          {product.categories && product.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.categories.map((c) => (
                <Badge key={c} variant="outline">{c}</Badge>
              ))}
            </div>
          )}

          {product.cardCount && (
            <p className="text-sm text-[var(--muted-foreground)]">{product.cardCount} cards in this deck</p>
          )}

          <div className="mt-auto space-y-3 pt-4">
            <p className="text-3xl font-bold text-violet-600">
              ฿{Number(product.priceTHB).toLocaleString()}
            </p>
            {user ? (
              <Button
                size="lg"
                className="w-full sm:w-auto"
                loading={buyMutation.isPending}
                onClick={() => buyMutation.mutate()}
              >
                Buy now
              </Button>
            ) : (
              <Button size="lg" className="w-full sm:w-auto" onClick={() => router.push('/auth/login')}>
                Sign in to buy
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
