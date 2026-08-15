import { Injectable } from '@nestjs/common';
import { ProductType } from '@prisma/client';
import { CatalogService } from '../services/catalog.service';
import { Features } from '../../../config/features';

@Injectable()
export class CatalogManager {
  constructor(private readonly service: CatalogService) {}

  async listProducts(type?: string, page = 1, limit = 20, search?: string, isAdmin = false) {
    let productType = type ? (type.toUpperCase() as ProductType) : undefined;
    // eTarot is currently ADMIN-only while in testing — everyone else caps to EBOOK
    if (!Features.etarot || !isAdmin) {
      productType = ProductType.EBOOK;
    }
    return this.service.getPublishedProducts(productType, { page, limit }, search);
  }

  async getEbookDetail(productId: string) {
    return this.service.getEbookDetail(productId);
  }

  async getTarotDeckDetail(productId: string, isAdmin = false) {
    if (!Features.etarot || !isAdmin) return null;
    return this.service.getTarotDeckDetail(productId);
  }

  async getProductDetail(productId: string, isAdmin = false) {
    const meta = await this.service.getProductMeta(productId);
    if (!meta) return null;
    return meta.productType === 'EBOOK'
      ? this.getEbookDetail(productId)
      : this.getTarotDeckDetail(productId, isAdmin);
  }

  async getEbookPreview(productId: string) {
    return this.service.getEbookPreview(productId);
  }
}
