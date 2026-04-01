import { Injectable } from '@nestjs/common';
import { ProductType } from '@prisma/client';
import { CatalogService } from '../services/catalog.service';

@Injectable()
export class CatalogManager {
  constructor(private readonly service: CatalogService) {}

  async listProducts(type?: string, page = 1, limit = 20) {
    const productType = type ? (type.toUpperCase() as ProductType) : undefined;
    return this.service.getPublishedProducts(productType, { page, limit });
  }

  async getEbookDetail(productId: string) {
    return this.service.getEbookDetail(productId);
  }

  async getTarotDeckDetail(productId: string) {
    return this.service.getTarotDeckDetail(productId);
  }
}
