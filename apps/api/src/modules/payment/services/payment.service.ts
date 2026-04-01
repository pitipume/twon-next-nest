import { Injectable } from '@nestjs/common';
import { PaymentRepository } from '../repositories/payment.repository';
import { StorageService } from '../../../infrastructure/storage/storage.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly repository: PaymentRepository,
    private readonly storage: StorageService,
  ) {}

  async getOrderWithItems(orderId: string) {
    return this.repository.findOrderWithItems(orderId);
  }

  async uploadSlip(orderId: string, slipBuffer: Buffer, contentType: string): Promise<string> {
    const key = `slips/${orderId}/slip.${contentType.includes('png') ? 'png' : 'jpg'}`;
    await this.storage.upload(key, slipBuffer, contentType);
    return key;
  }

  async submitSlip(orderId: string, slipKey: string, transferredAt: Date, note?: string) {
    return this.repository.submitSlip(orderId, slipKey, transferredAt, note);
  }

  async approvePayment(orderId: string, adminId: string) {
    const order = await this.repository.findOrderWithItems(orderId);
    if (!order) return null;

    await this.repository.approvePayment(orderId, adminId);

    // Grant library access for every product in this order
    const productIds = order.orderItems.map((i) => i.productId);
    await this.repository.grantLibraryAccess(order.userId, orderId, productIds);

    return order;
  }

  async rejectPayment(orderId: string, adminId: string, reason: string) {
    return this.repository.rejectPayment(orderId, adminId, reason);
  }

  async getPendingOrders() {
    const orders = await this.repository.findPendingOrders();
    return Promise.all(
      orders.map(async (order) => {
        const slipUrl = order.payment?.slipImageKey
          ? await this.storage.getSignedReadUrl(order.payment.slipImageKey, 60 * 60)
          : null;
        return { ...order, payment: { ...order.payment, slipUrl } };
      }),
    );
  }

  async getSlipUrl(orderId: string): Promise<string | null> {
    const payment = await this.repository.findPaymentByOrderId(orderId);
    if (!payment?.slipImageKey) return null;
    return this.storage.getSignedReadUrl(payment.slipImageKey, 60 * 60);
  }
}
