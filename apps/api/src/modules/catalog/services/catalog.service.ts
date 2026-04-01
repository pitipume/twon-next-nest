import { Injectable } from '@nestjs/common';
import { ProductType } from '@prisma/client';
import { CatalogRepository, PaginationParams } from '../repositories/catalog.repository';

@Injectable()
export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  async getPublishedProducts(type?: ProductType, pagination?: PaginationParams) {
    return this.repository.findPublishedProducts(type, pagination);
  }

  async getEbookDetail(productId: string) {
    const product = await this.repository.findProductById(productId);
    if (!product || !product.isPublished) return null;

    const ebook = await this.repository.findEbookByProductId(productId);
    if (!ebook) return null;

    return { product, ebook };
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
