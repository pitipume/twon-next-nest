import { Injectable } from '@nestjs/common';
import { StoreRepository } from '../repositories/store.repository';
import { StorageService } from '../../../infrastructure/storage/storage.service';

@Injectable()
export class StoreService {
  constructor(
    private readonly repository: StoreRepository,
    private readonly storage: StorageService,
  ) {}

  async getPublishedProducts(productIds: string[]) {
    return this.repository.findProductsByIds(productIds);
  }

  async getAlreadyOwned(userId: string, productIds: string[]) {
    return this.repository.findAlreadyOwned(userId, productIds);
  }

  async createOrder(userId: string, items: { productId: string; priceTHB: number }[]) {
    const total = items.reduce((sum, i) => sum + i.priceTHB, 0);
    return this.repository.createOrder({ userId, totalTHB: total, items });
  }

  async getOrderById(orderId: string) {
    return this.repository.findOrderById(orderId);
  }

  async getOrdersByUser(userId: string) {
    return this.repository.findOrderByUserId(userId);
  }

  async getCheckoutInfo() {
    const config = await this.repository.getPaymentConfig();
    if (!config || !config.qrImageKey) return null;

    const qrImageUrl = await this.storage.getSignedReadUrl(config.qrImageKey, 60 * 30);
    return {
      bankName: config.bankName,
      accountName: config.accountName,
      accountNumber: config.accountNumber,
      qrImageUrl,
    };
  }
}
