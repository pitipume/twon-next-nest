import { Injectable } from '@nestjs/common';
import { ProductType } from '@prisma/client';
import { CatalogRepository, PaginationParams } from '../repositories/catalog.repository';
import { StorageService } from '../../../infrastructure/storage/storage.service';

const COVER_TTL = 60 * 60 * 24; // 24 hours — thumbnails don't need long TTL

@Injectable()
export class CatalogService {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly storage: StorageService,
  ) {}

  private async signCoverUrl(raw: string): Promise<string> {
    if (!raw) return '';
    if (raw.startsWith('http')) return raw; // backward compat: old data stored full URL
    return this.storage.getSignedReadUrl(raw, COVER_TTL);
  }

  async getPublishedProducts(type?: ProductType, pagination?: PaginationParams, search?: string) {
    const result = await this.repository.findPublishedProducts(type, pagination, search);
    const items = await Promise.all(
      result.items.map(async (item) => ({
        ...item,
        coverImageUrl: await this.signCoverUrl(item.coverImageUrl),
      })),
    );
    return { ...result, items };
  }

  async getEbookDetail(productId: string) {
    const product = await this.repository.findProductById(productId);
    if (!product || !product.isPublished) return null;

    const ebook = await this.repository.findEbookByProductId(productId);
    if (!ebook) return null;

    return { product, ebook };
  }

  async getProductMeta(productId: string) {
    return this.repository.findProductById(productId);
  }

  async getTarotDeckDetail(productId: string) {
    const product = await this.repository.findProductById(productId);
    if (!product || !product.isPublished) return null;

    const deck = await this.repository.findTarotDeckByProductId(productId);
    if (!deck) return null;

    // Return deck with cards but mask fileKeys — never expose storage keys to client
    const safeCards = deck.cards.map(({ imageKey: _, ...card }) => card);
    return { product, deck: { ...deck.toObject(), cards: safeCards } };
  }
}
