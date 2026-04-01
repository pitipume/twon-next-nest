import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PaymentService } from '../services/payment.service';

@Injectable()
export class PaymentManager {
  constructor(private readonly service: PaymentService) {}

  async submitSlip(
    userId: string,
    orderId: string,
    slipBuffer: Buffer,
    contentType: string,
    transferredAt: Date,
    note?: string,
  ) {
    const order = await this.service.getOrderWithItems(orderId);
    if (!order) return { success: false, message: 'Order not found.' } as const;
    if (order.userId !== userId) return { success: false, message: 'Order not found.' } as const;
    if (order.status !== OrderStatus.PENDING) {
      return { success: false, message: 'Slip has already been submitted for this order.' } as const;
    }

    const slipKey = await this.service.uploadSlip(orderId, slipBuffer, contentType);
    await this.service.submitSlip(orderId, slipKey, transferredAt, note);

    return { success: true, message: 'Payment slip submitted. Awaiting approval.' } as const;
  }

  async approvePayment(adminId: string, orderId: string) {
    const order = await this.service.getOrderWithItems(orderId);
    if (!order) return { success: false, message: 'Order not found.' } as const;
    if (order.status !== OrderStatus.WAITING_APPROVAL) {
      return { success: false, message: 'This order is not awaiting approval.' } as const;
    }

    await this.service.approvePayment(orderId, adminId);
    return { success: true, message: 'Payment approved. Library access granted.' } as const;
  }

  async rejectPayment(adminId: string, orderId: string, reason: string) {
    const order = await this.service.getOrderWithItems(orderId);
    if (!order) return { success: false, message: 'Order not found.' } as const;
    if (order.status !== OrderStatus.WAITING_APPROVAL) {
      return { success: false, message: 'This order is not awaiting approval.' } as const;
    }

    await this.service.rejectPayment(orderId, adminId, reason);
    return { success: true, message: 'Payment rejected.' } as const;
  }

  async getPendingOrders() {
    return this.service.getPendingOrders();
  }
}
