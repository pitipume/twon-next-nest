'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Product } from '@/types/product';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const t = useTranslations('product');
  const isEbook = product.productType === 'EBOOK';

  return (
    <Link
      href={`/catalog/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] transition-all hover:shadow-lg hover:-translate-y-0.5"
    >
      {/* Cover */}
      <div className="relative aspect-[2/3] overflow-hidden bg-[var(--muted)]">
        {product.coverImageUrl ? (
          <Image
            src={product.coverImageUrl}
            alt={product.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-[var(--muted-foreground)]">
            {isEbook ? '📖' : '🃏'}
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge variant={isEbook ? 'default' : 'warning'}>
            {isEbook ? t('ebook') : t('tarot')}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{product.title}</h3>
        {product.author && (
          <p className="text-xs text-[var(--muted-foreground)]">{product.author}</p>
        )}
        {product.cardCount && (
          <p className="text-xs text-[var(--muted-foreground)]">
            {t('cards', { count: product.cardCount })}
          </p>
        )}
        <div className="mt-auto pt-2">
          <span className="text-sm font-semibold text-violet-600">
            ฿{Number(product.priceTHB).toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
