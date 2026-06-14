import { Injectable } from '@nestjs/common';
import { ProductType } from '@prisma/client';
import { CatalogService } from '../services/catalog.service';
import { Features } from '../../../config/features';

@Injectable()
export class CatalogManager {
  constructor(private readonly service: CatalogService) {}

  async listProducts(type?: string, page = 1, limit = 20, search?: string) {
    let productType = type ? (type.toUpperCase() as ProductType) : undefined;
    // When eTarot is off, always cap to EBOOK only — ignores any tarot filter
    if (!Features.etarot) {
      productType = ProductType.EBOOK;
    }
    return this.service.getPublishedProducts(productType, { page, limit }, search);
  }

  async getEbookDetail(productId: string) {
    return this.service.getEbookDetail(productId);
  }

  async getTarotDeckDetail(productId: string) {
    return this.service.getTarotDeckDetail(productId);
  }

  async getProductDetail(productId: string) {
    const meta = await this.service.getProductMeta(productId);
    if (!meta) return null;
    return meta.productType === 'EBOOK'
      ? this.getEbookDetail(productId)
      : this.getTarotDeckDetail(productId);
  }
}
