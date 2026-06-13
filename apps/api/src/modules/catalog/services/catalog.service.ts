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

    return {
      id: product.id,
      mongoRefId: product.mongoRefId,
      productType: product.productType,
      title: product.title,
      priceTHB: Number(product.priceTHB),
      coverImageUrl: await this.signCoverUrl(ebook.coverImageUrl ?? ''),
      author: ebook.author,
      description: ebook.description,
      language: ebook.language,
      categories: ebook.categories,
      totalPages: ebook.totalPages,
      previewPages: ebook.previewPages,
    };
  }

  async getProductMeta(productId: string) {
    return this.repository.findProductById(productId);
  }

  async getTarotDeckDetail(productId: string) {
    const product = await this.repository.findProductById(productId);
    if (!product || !product.isPublished) return null;

    const deck = await this.repository.findTarotDeckByProductId(productId);
    if (!deck) return null;

    return {
      id: product.id,
      mongoRefId: product.mongoRefId,
      productType: product.productType,
      title: product.title,
      priceTHB: Number(product.priceTHB),
      coverImageUrl: await this.signCoverUrl(deck.coverImageUrl ?? ''),
      description: deck.description,
      cardCount: deck.cardCount,
    };
  }
}
