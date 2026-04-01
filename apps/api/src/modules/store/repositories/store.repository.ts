import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class StoreRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findProductsByIds(productIds: string[]) {
    return this.prisma.product.findMany({
      where: { id: { in: productIds }, isPublished: true },
    });
  }

  async findAlreadyOwned(userId: string, productIds: string[]): Promise<string[]> {
    const owned = await this.prisma.libraryItem.findMany({
      where: { userId, productId: { in: productIds } },
      select: { productId: true },
    });
    return owned.map((o) => o.productId);
  }

  async createOrder(data: {
    userId: string;
    totalTHB: number;
    items: { productId: string; priceTHB: number }[];
  }) {
    return this.prisma.order.create({
      data: {
        userId: data.userId,
        totalTHB: data.totalTHB,
        status: OrderStatus.PENDING,
        orderItems: {
          create: data.items.map((item) => ({
            productId: item.productId,
            priceTHB: item.priceTHB,
          })),
        },
        payment: {
          create: {
            amountTHB: data.totalTHB,
            status: PaymentStatus.PENDING,
          },
        },
      },
      include: { orderItems: true, payment: true },
    });
  }

  async findOrderById(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: { include: { product: true } },
        payment: true,
      },
    });
  }

  async findOrderByUserId(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { orderItems: { include: { product: true } }, payment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPaymentConfig() {
    return this.prisma.paymentConfig.findUnique({ where: { id: 'singleton' } });
  }
}
