import { Injectable } from '@nestjs/common';
import { StoreService } from '../services/store.service';

@Injectable()
export class StoreManager {
  constructor(private readonly service: StoreService) {}

  async createOrder(userId: string, productIds: string[]) {
    // 1. Validate all products exist and are published
    const products = await this.service.getPublishedProducts(productIds);
    if (products.length !== productIds.length) {
      return { success: false, message: 'One or more products are unavailable.' } as const;
    }

    // 2. Check customer doesn't already own any of them
    const alreadyOwned = await this.service.getAlreadyOwned(userId, productIds);
    if (alreadyOwned.length > 0) {
      return { success: false, message: 'You already own one or more of these products.' } as const;
    }

    // 3. Build order items with price locked at current price
    const items = products.map((p) => ({
      productId: p.id,
      priceTHB: Number(p.priceTHB),
    }));

    // 4. Create order + payment record
    const order = await this.service.createOrder(userId, items);

    // 5. Get bank/QR info to show at checkout
    const checkoutInfo = await this.service.getCheckoutInfo();

    return {
      success: true,
      data: {
        id: order.id,
        totalTHB: Number(order.totalTHB),
        status: order.status,
        items: order.orderItems.map((i) => ({
          productId: i.productId,
          title: products.find((p) => p.id === i.productId)?.title,
          priceTHB: Number(i.priceTHB),
        })),
        checkoutInfo,
      },
    } as const;
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.service.getOrderById(orderId);
    if (!order) return { success: false, message: 'Order not found.' } as const;
    if (order.userId !== userId) return { success: false, message: 'Order not found.' } as const;

    const checkoutInfo = await this.service.getCheckoutInfo();
    return {
      success: true,
      data: {
        ...order,
        totalTHB: Number(order.totalTHB),
        orderItems: order.orderItems.map((i) => ({
          ...i,
          priceTHB: Number(i.priceTHB),
        })),
        checkoutInfo,
      },
    } as const;
  }

  async getMyOrders(userId: string) {
    return this.service.getOrdersByUser(userId);
  }
}
