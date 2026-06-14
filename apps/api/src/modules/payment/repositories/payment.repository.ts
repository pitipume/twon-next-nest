import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPaymentByOrderId(orderId: string) {
    return this.prisma.payment.findUnique({ where: { orderId } });
  }

  async findOrderWithItems(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true, payment: true },
    });
  }

  async submitSlip(
    orderId: string,
    slipImageKey: string,
    transferredAt: Date,
    note?: string,
  ) {
    return this.prisma.$transaction([
      this.prisma.payment.update({
        where: { orderId },
        data: {
          slipImageKey,
          transferredAt,
          note,
          status: PaymentStatus.WAITING_APPROVAL,
        },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.WAITING_APPROVAL },
      }),
    ]);
  }

  async getCommissionRate(): Promise<number> {
    const config = await this.prisma.paymentConfig.findUnique({ where: { id: 'singleton' } });
    return Number(config?.commissionRate ?? 0);
  }

  async approvePayment(
    orderId: string,
    adminId: string,
    itemCommissions: Array<{ id: string; commissionRate: number; commissionAmount: number; netAmount: number }>,
  ) {
    return this.prisma.$transaction([
      this.prisma.payment.update({
        where: { orderId },
        data: { status: PaymentStatus.APPROVED, approvedBy: adminId, approvedAt: new Date() },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.COMPLETED },
      }),
      ...itemCommissions.map(({ id, commissionRate, commissionAmount, netAmount }) =>
        this.prisma.orderItem.update({
          where: { id },
          data: { commissionRate, commissionAmount, netAmount },
        }),
      ),
    ]);
  }

  async rejectPayment(orderId: string, adminId: string, reason: string) {
    return this.prisma.$transaction([
      this.prisma.payment.update({
        where: { orderId },
        data: {
          status: PaymentStatus.REJECTED,
          approvedBy: adminId,
          approvedAt: new Date(),
          rejectionReason: reason,
        },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.REJECTED },
      }),
    ]);
  }

  async findPendingOrders() {
    return this.prisma.order.findMany({
      where: { status: OrderStatus.WAITING_APPROVAL },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        orderItems: { include: { product: true } },
        payment: true,
      },
      orderBy: { updatedAt: 'asc' }, // oldest first so admin sees what's waiting longest
    });
  }

  async grantLibraryAccess(userId: string, orderId: string, productIds: string[]) {
    return this.prisma.libraryItem.createMany({
      data: productIds.map((productId) => ({ userId, productId, orderId })),
      skipDuplicates: true,
    });
  }
}
